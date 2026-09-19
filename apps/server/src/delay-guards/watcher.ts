/**
 * watcher.ts — the Delay Guard check loop: every cycle, every guarded train in
 * its watch window is looked up in the SIRI snapshot and its rider told when it
 * is late enough (derive.ts). Runs inside the web service beside the station
 * alerts watcher, under the same opt-in (STATION_ALERTS_ENABLED).
 */
import { siriStaleSeconds, stationAlertsCheckSeconds } from "../data/config"
import { getActiveFeed } from "../db"
import { logNames, logger } from "../logs"
import { type DayTrips, loadDayTrips } from "../requests/gtfs-route-api"
import { naiveNowMs } from "../siri/correlate"
import { getRealtimeSnapshot, makeRealtimeLookup } from "../siri/snapshot"
import { guardKey } from "../types/delay-guards"
import { railServiceDatesForQuery, toIsoString } from "../utils/gtfs-time"
import { sendAlertPush } from "../station-alerts/notify"
import { type GuardMemory, type GuardedTrip, decideGuard, deriveGuardState } from "./derive"
import { guardMessage } from "./message"
import { readGuardMemories, readGuardSubscriptions, removeGuardSubscription, writeGuardMemory } from "./store"

const MAX_BACKOFF_MS = 10 * 60_000

export type GuardCheckSummary = { subscriptions: number; guards: number; pushed: number; dropped: number }

/** The runs of every train number on the days in view, for the guards' lookups. */
const indexByTrain = (days: { serviceDate: string; trips: DayTrips }[]): Map<number, GuardedTrip[]> => {
  const byTrain = new Map<number, GuardedTrip[]>()
  for (const { serviceDate, trips } of days) {
    for (const trip of trips.values()) {
      const list = byTrain.get(trip.trainNumber) ?? []
      list.push({ serviceDate, trip })
      byTrain.set(trip.trainNumber, list)
    }
  }
  return byTrain
}

export const runDelayGuardsCheck = async (): Promise<GuardCheckSummary> => {
  const subscriptions = await readGuardSubscriptions()
  const summary: GuardCheckSummary = { subscriptions: subscriptions.length, guards: 0, pushed: 0, dropped: 0 }
  if (subscriptions.length === 0) return summary

  const feed = await getActiveFeed()
  if (!feed) return summary

  const nowRealMs = Date.now()
  const nowNaive = naiveNowMs()
  const nowIso = toIsoString(nowNaive)
  const serviceDates = railServiceDatesForQuery(nowIso.slice(0, 10), nowIso.slice(11, 16))
  const [days, snapshot] = await Promise.all([
    Promise.all(serviceDates.map(async (serviceDate) => ({ serviceDate, trips: await loadDayTrips(feed.feedId, serviceDate) }))),
    getRealtimeSnapshot(),
  ])
  const byTrain = indexByTrain(days)
  const live = snapshot !== null && nowRealMs - snapshot.updatedAt <= siriStaleSeconds * 1000
  const lookup = makeRealtimeLookup(snapshot, nowRealMs)
  const memories = await readGuardMemories()

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
      await removeGuardSubscription(subscription.token)
      summary.dropped += 1
      logger?.info(logNames.delayGuards.dropped, { provider: subscription.provider })
    } else if (changed || Object.keys(memory).length !== Object.keys(next).length) {
      await writeGuardMemory(subscription.token, next)
    }
  }

  return summary
}

// --- the loop --------------------------------------------------------------------------

let failures = 0
let timer: ReturnType<typeof setTimeout> | undefined

const cycle = async () => {
  let delayMs = stationAlertsCheckSeconds * 1000
  try {
    const summary = await runDelayGuardsCheck()
    if (failures > 0) logger?.info(logNames.delayGuards.recovered, summary)
    failures = 0
  } catch (error) {
    failures += 1
    if (failures === 1) logger?.error(logNames.delayGuards.checkFailed, { error })
    delayMs = Math.min(delayMs * 2 ** failures, MAX_BACKOFF_MS)
  }
  timer = setTimeout(cycle, delayMs)
}

export const startDelayGuards = (): void => {
  if (timer) return
  logger?.info(logNames.delayGuards.started, { everySeconds: stationAlertsCheckSeconds })
  timer = setTimeout(cycle, 8_000)
}
