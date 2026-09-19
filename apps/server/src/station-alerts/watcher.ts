/**
 * watcher.ts — the station alerts check loop.
 *
 * Every cycle it takes the service status the app's screens show and, for every
 * subscribed station, judges it the way the station card does (derive.ts); a
 * change worth telling goes out as a push (notify.ts). What each device was
 * told is kept in redis (store.ts), so a restart neither repeats nor forgets.
 *
 * Runs inside the web service, which is where the status is computed (it needs
 * Postgres) and the push clients live. Like ride tracking it is opt-in
 * (STATION_ALERTS_ENABLED — see data/config.ts): a local run pointed at the
 * production redis must never page real riders. setTimeout-chaining, never
 * setInterval, so cycles cannot overlap; failures back off and only state
 * transitions are logged.
 */
import { stationAlertsCheckSeconds } from "../data/config"
import { logNames, logger } from "../logs"
import { naiveNowMs } from "../siri/correlate"
import { getStationDepartures } from "../status/departures"
import { getServiceStatus } from "../status/service-status"
import type { StationDepartures } from "../types/station-departures"
import { currentDayType } from "./day-type"
import { type AlertMemory, decideAlert, deriveStationAlertState } from "./derive"
import { alertMessage } from "./message"
import { sendStationAlert } from "./notify"
import { readMemories, readSubscriptions, removeSubscription, writeMemory } from "./store"

const MAX_BACKOFF_MS = 10 * 60_000

export type CheckSummary = { subscriptions: number; stations: number; pushed: number; dropped: number }

/** One check over every subscription. Exported for the tests and the debug route. */
export const runStationAlertsCheck = async (): Promise<CheckSummary> => {
  const subscriptions = await readSubscriptions()
  const summary: CheckSummary = { subscriptions: subscriptions.length, stations: 0, pushed: 0, dropped: 0 }
  if (subscriptions.length === 0) return summary

  const snapshot = await getServiceStatus()
  if (!snapshot) return summary

  // The next trains of every subscribed station, once each (the derivation caches the day's trips).
  const stationIds = [...new Set(subscriptions.flatMap((s) => s.stations.map((c) => c.stationId)))]
  summary.stations = stationIds.length
  const departures = new Map<string, StationDepartures | null>()
  for (const stationId of stationIds) {
    try {
      departures.set(stationId, await getStationDepartures(stationId))
    } catch (error) {
      logger?.warn(logNames.stationDepartures.failed, { stationId, error })
      departures.set(stationId, null)
    }
  }

  const memories = await readMemories()
  const nowMs = Date.now()
  const nowNaive = naiveNowMs()
  const dayType = currentDayType(nowNaive)

  for (const subscription of subscriptions) {
    const memory = memories.get(subscription.token) ?? {}
    const next: Record<string, AlertMemory> = {}
    let changed = false
    let unregistered = false

    for (const choice of subscription.stations) {
      const before = memory[choice.stationId]
      // Outside the days asked for: nothing is said, and what was said stands until the station is watched again.
      if (choice.dayTypes && !choice.dayTypes.includes(dayType)) {
        next[choice.stationId] = before?.notified ? { notified: before.notified } : {}
        if (JSON.stringify(before ?? {}) !== JSON.stringify(next[choice.stationId])) changed = true
        continue
      }
      const state = deriveStationAlertState({
        snapshot,
        departures: departures.get(choice.stationId) ?? null,
        stationId: choice.stationId,
        lineIds: choice.lineIds,
        nowNaiveMs: nowNaive,
      })
      const decision = decideAlert(before, state, nowMs)
      next[choice.stationId] = decision.memory
      if (JSON.stringify(before ?? {}) !== JSON.stringify(decision.memory)) changed = true
      if (!decision.push || unregistered) continue

      const message = alertMessage(decision.push, state, choice.stationId, subscription.locale, choice.lineIds !== null)
      const result = await sendStationAlert(subscription.token, subscription.provider, choice.stationId, message)
      if (result === "sent") {
        summary.pushed += 1
        logger?.info(logNames.stationAlerts.pushed, {
          provider: subscription.provider,
          stationId: choice.stationId,
          push: decision.push,
          kind: state.kind,
          level: state.level,
          signature: state.signature,
        })
      } else if (result === "unregistered") {
        unregistered = true
      } else {
        // Not delivered: forget the push so the next cycle tries again.
        next[choice.stationId] = { ...decision.memory, notified: before?.notified }
      }
    }

    if (unregistered) {
      await removeSubscription(subscription.token)
      summary.dropped += 1
      logger?.info(logNames.stationAlerts.dropped, { provider: subscription.provider })
    } else if (changed || Object.keys(memory).length !== Object.keys(next).length) {
      await writeMemory(subscription.token, next)
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
    const summary = await runStationAlertsCheck()
    if (failures > 0) logger?.info(logNames.stationAlerts.recovered, summary)
    failures = 0
  } catch (error) {
    failures += 1
    if (failures === 1) logger?.error(logNames.stationAlerts.checkFailed, { error })
    delayMs = Math.min(delayMs * 2 ** failures, MAX_BACKOFF_MS)
  }
  timer = setTimeout(cycle, delayMs)
}

export const startStationAlerts = (): void => {
  if (timer) return
  logger?.info(logNames.stationAlerts.started, { everySeconds: stationAlertsCheckSeconds })
  timer = setTimeout(cycle, 5_000)
}
