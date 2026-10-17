/**
 * watcher.ts — the Delay Notifications check loop: every cycle, every guarded train in
 * its watch window is looked up in the SIRI snapshot and its rider told when it
 * is late enough (derive.ts). Runs inside the web service beside the station
 * alerts watcher, under the same opt-in (STATION_ALERTS_ENABLED).
 */
import { stationAlertsCheckSeconds } from "../data/config"
import { getActiveFeed } from "../db"
import { logNames, logger } from "../logs"
import { type DayTrips, loadTripsAround, serviceDateOf } from "../requests/gtfs-route-api"
import { naiveNowMs } from "../siri/correlate"
import { getRealtimeSnapshot, isSnapshotFresh, makeRealtimeLookup } from "../siri/snapshot"
import { guardKey } from "../types/delay-guards"
import { sendAlertPush } from "../station-alerts/notify"
import { createPollLoop } from "../utils/poll-loop"
import { type GuardMemory, type GuardedTrip, decideGuard, deriveGuardState } from "./derive"
import { guardMessage } from "./message"
import { delayGuardStore } from "./store"

export type GuardCheckSummary = { subscriptions: number; guards: number; pushed: number; dropped: number }

/** The runs of every train number on the days in view, for the guards' lookups. */
const indexByTrain = (trips: DayTrips): Map<number, GuardedTrip[]> => {
  const byTrain = new Map<number, GuardedTrip[]>()
  for (const trip of trips.values()) {
    const list = byTrain.get(trip.trainNumber) ?? []
    list.push({ serviceDate: serviceDateOf(trip), trip })
    byTrain.set(trip.trainNumber, list)
  }
  return byTrain
}

export const runDelayGuardsCheck = async (): Promise<GuardCheckSummary> => {
  const subscriptions = await delayGuardStore.readSubscriptions()
  const summary: GuardCheckSummary = { subscriptions: subscriptions.length, guards: 0, pushed: 0, dropped: 0 }
  if (subscriptions.length === 0) return summary

  const feed = await getActiveFeed()
  if (!feed) return summary

  const nowRealMs = Date.now()
  const nowNaive = naiveNowMs()
  const [trips, snapshot, memories] = await Promise.all([
    loadTripsAround(feed.feedId, nowNaive),
    getRealtimeSnapshot(),
    delayGuardStore.readMemories(),
  ])
  const byTrain = indexByTrain(trips)
  const live = isSnapshotFresh(snapshot, nowRealMs)
  const lookup = makeRealtimeLookup(snapshot, nowRealMs)

  for (const subscription of subscriptions) {
    const memory = memories.get(subscription.token) ?? {}
    const next: Record<string, GuardMemory> = {}
    let changed = false
    let unregistered = false

    for (const guard of subscription.guards) {
      summary.guards += 1
      const key = guardKey(guard)
      const before = memory[key]
      const state = deriveGuardState(guard, byTrain.get(guard.trainNumber) ?? [], lookup, live, nowNaive)
      const decision = decideGuard(before, state, guard, nowRealMs)
      if (decision.memory) next[key] = decision.memory
      if (JSON.stringify(before ?? null) !== JSON.stringify(decision.memory ?? null)) changed = true
      if (!decision.push || unregistered) continue

      const message = guardMessage(decision.push, state, guard, subscription.locale)
      const result = await sendAlertPush(
        subscription.token,
        subscription.provider,
        message,
        {
          type: "delay-guard",
          trainNumber: String(guard.trainNumber),
          originStationId: guard.originStationId,
          destinationStationId: guard.destinationStationId,
        },
        `guard-${key}`,
      )
      if (result === "sent") {
        summary.pushed += 1
        logger?.info(logNames.delayGuards.pushed, { provider: subscription.provider, guard: key, ...decision.push })
      } else if (result === "unregistered") {
        unregistered = true
      } else if (before) {
        next[key] = before // not delivered: try again next cycle
      } else {
        delete next[key]
      }
    }

    if (unregistered) {
      await delayGuardStore.removeSubscription(subscription.token)
      summary.dropped += 1
      logger?.info(logNames.delayGuards.dropped, { provider: subscription.provider })
    } else if (changed || Object.keys(memory).length !== Object.keys(next).length) {
      await delayGuardStore.writeMemory(subscription.token, next)
    }
  }

  return summary
}

// --- the loop --------------------------------------------------------------------------

const loop = createPollLoop({
  run: runDelayGuardsCheck,
  everyMs: stationAlertsCheckSeconds * 1000,
  maxBackoffMs: 10 * 60_000,
  initialDelayMs: 8_000,
  log: { failed: logNames.delayGuards.checkFailed, recovered: logNames.delayGuards.recovered },
})

export const startDelayGuards = (): void => {
  logger?.info(logNames.delayGuards.started, { everySeconds: stationAlertsCheckSeconds })
  loop.start()
}
