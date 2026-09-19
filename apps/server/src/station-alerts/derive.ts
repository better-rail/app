/**
 * derive.ts — what a subscribed station is going through, and whether that is
 * worth a push. Pure: feed it the status snapshot and the station's departures
 * (see tests/station-alerts.test.ts).
 *
 * A station's state is judged the way the app's station card judges it
 * (apps/mobile/src/screens/service-status/station-status.ts): the disruptions
 * that name the station on the lines the device asked about, and how the
 * station's own next trains on those lines are running. Delays and a lone
 * cancellation on a line are about single trains that can be anywhere along it,
 * so they only count through the station's own trains.
 *
 * A notification goes out when the state changes in a way the rider would want
 * to know: something new is wrong, the same thing got worse, or the trouble that
 * was reported is over. Minor delays (a few trains a few minutes late) are not
 * news: they colour the card but never page anyone. The state has to hold for a
 * check cycle first, so a feed blip never pages anyone, and the same station is
 * not pushed again within a few minutes unless it got worse.
 */
import type { Disruption, LineStatus, LocalizedText, ServiceStatusLevel, ServiceStatusSnapshot } from "../types/service-status"
import { MINOR_DELAY_MINUTES, SEVERE_DELAY_MINUTES, compareLevels } from "../types/service-status"
import type { StationDepartures } from "../types/station-departures"

// --- the station's state --------------------------------------------------------------

/** How far ahead the station's own trains count. */
const NEXT_TRAINS_HORIZON_MS = 60 * 60_000
/** Late trains it takes, among those, before the station has delays; one badly late is enough alone. */
const LATE_TRAINS_FOR_DELAYS = 2

export type StationAlertKind = "good" | "delays" | "cancellations" | "skippedStops" | "planned" | "noService" | "unknown"

/** The disruption the alert is about, when a named one is. */
export type AlertHeadline = {
  id: string
  lineId: string
  kind: Disruption["kind"]
  source: Disruption["source"]
  section: { fromStationId: string; toStationId: string } | null
  reason?: LocalizedText
}

export type StationAlertState = {
  kind: StationAlertKind
  level: ServiceStatusLevel
  /** The named disruption behind the state; absent when the station's own trains are the news. */
  headline?: AlertHeadline
  /** The station's own next trains on the lines asked about, within the horizon. */
  trains: { maxDelayMinutes: number; cancelled: number; late: number; lineIds: string[] }
  /** Stable while the situation is the same; a change means there is something new to say. */
  signature: string
}

const isDisrupted = (level: ServiceStatusLevel): boolean =>
  level === "minorDelays" || level === "severeDelays" || level === "partSuspended" || level === "suspended"

const worst = (levels: ServiceStatusLevel[]): ServiceStatusLevel | undefined =>
  levels.length === 0 ? undefined : levels.reduce((a, b) => (compareLevels(b, a) > 0 ? b : a))

const kindOfDisruption = (d: Pick<Disruption, "kind" | "source">): StationAlertKind => {
  if (d.source === "announcement") return "planned"
  if (d.kind === "skippedStops") return "skippedStops"
  if (d.kind === "delays") return "delays"
  return "cancellations"
}

export type StationAlertInput = {
  snapshot: ServiceStatusSnapshot
  /** The station's next trains: null when they cannot be had right now. */
  departures: StationDepartures | null
  stationId: string
  /** The lines the device asked about; null for every line calling at the station. */
  lineIds: string[] | null
  /** Naive Israel wall-clock epoch ms, as the departures' times read. */
  nowNaiveMs: number
}

/** The lines of the snapshot that run through the station, limited to the ones asked about. */
export const linesThrough = (snapshot: ServiceStatusSnapshot, stationId: string, lineIds: string[] | null): LineStatus[] =>
  snapshot.lines.filter((l) => l.line.stationIds.includes(stationId) && (lineIds === null || lineIds.includes(l.lineId)))

export const deriveStationAlertState = (input: StationAlertInput): StationAlertState => {
  const { snapshot, departures, stationId, lineIds, nowNaiveMs } = input
  const lines = linesThrough(snapshot, stationId, lineIds)

  // What names the station, worst first.
  const named: (AlertHeadline & { level: ServiceStatusLevel })[] = []
  for (const line of lines) {
    for (const d of line.disruptions) {
      if (!isDisrupted(d.level) || !d.section?.stationIds.includes(stationId)) continue
      named.push({
        id: d.id,
        lineId: line.lineId,
        kind: d.kind,
        source: d.source,
        level: d.level,
        section: { fromStationId: d.section.fromStationId, toStationId: d.section.toStationId },
        reason: d.reason,
      })
    }
  }
  named.sort((a, b) => compareLevels(b.level, a.level))

  // The station's own next trains on those lines.
  const trainsKnown = departures !== null && departures.realtime.available
  const horizon = nowNaiveMs + NEXT_TRAINS_HORIZON_MS
  const soonLines = (departures?.lines ?? []).filter((l) => lineIds === null || lineIds.includes(l.lineId))
  const soon = soonLines.flatMap((l) =>
    l.directions.flatMap((d) =>
      d.trains.filter((t) => Date.parse(`${t.time}Z`) <= horizon).map((t) => ({ ...t, lineId: l.lineId })),
    ),
  )
  const cancelledTrains = soon.filter((t) => t.cancelled)
  const lateTrains = soon.filter((t) => !t.cancelled && t.delayMinutes >= MINOR_DELAY_MINUTES)
  const trains = {
    maxDelayMinutes: lateTrains.reduce((max, t) => Math.max(max, t.delayMinutes), 0),
    cancelled: cancelledTrains.length,
    late: lateTrains.length,
    lineIds: [...new Set([...cancelledTrains, ...lateTrains].map((t) => t.lineId))],
  }
  let ownLevel: ServiceStatusLevel | undefined
  if (trainsKnown) {
    if (cancelledTrains.length >= 2) ownLevel = "partSuspended"
    else if (cancelledTrains.length === 1 || lateTrains.some((t) => t.delayMinutes >= SEVERE_DELAY_MINUTES))
      ownLevel = "severeDelays"
    else if (lateTrains.length >= LATE_TRAINS_FOR_DELAYS) ownLevel = "minorDelays"
  }

  const here = worst([...named.map((d) => d.level), ...(ownLevel ? [ownLevel] : [])])
  if (here) {
    const top = named[0]
    // A named disruption at least as bad as the station's own trains is the story; else the trains are.
    if (top && (!ownLevel || compareLevels(top.level, ownLevel) >= 0)) {
      const { level: _level, ...headline } = top
      const kind = kindOfDisruption(top)
      return { kind, level: here, headline, trains, signature: `${kind}:${top.id}` }
    }
    const kind: StationAlertKind = trains.cancelled > 0 ? "cancellations" : "delays"
    return { kind, level: here, trains, signature: `${kind}:trains` }
  }

  if (lines.length === 0 || lines.every((l) => l.level === "noService")) {
    return { kind: "noService", level: "noService", trains, signature: "noService" }
  }
  // Trouble elsewhere on a line that the station's own trains do not show is not the station's news.
  const known = lines.some((l) => l.level === "goodService" || (trainsKnown && isDisrupted(l.level)))
  return known
    ? { kind: "good", level: "goodService", trains, signature: "good" }
    : { kind: "unknown", level: "unknown", trains, signature: "unknown" }
}

// --- whether to push ------------------------------------------------------------------

/** A state has to be seen this long before it is pushed (one check cycle at the default cadence). */
export const CONFIRM_MS = 60_000
/** The same station is not pushed again within this, unless things got worse. */
export const MIN_GAP_MS = 5 * 60_000
/** An all-clear is only worth sending this soon after the trouble was reported; later it just goes quiet. */
export const CLEARED_WINDOW_MS = 6 * 60 * 60_000

/** What the device was last told about a station, and what may be coming. Kept between checks. */
export type AlertMemory = {
  /** The disruption last pushed; absent once an all-clear went out (or nothing was ever pushed). */
  notified?: { signature: string; level: ServiceStatusLevel; at: number }
  /** A change seen but not yet held long enough to push. */
  candidate?: { signature: string; level: ServiceStatusLevel; since: number }
}

export type AlertDecision = {
  memory: AlertMemory
  /** What to push, when the change is confirmed and worth it. */
  push?: "disruption" | "cleared"
}

export const decideAlert = (previous: AlertMemory | undefined, state: StationAlertState, nowMs: number): AlertDecision => {
  const memory: AlertMemory = { ...(previous ?? {}) }
  const { notified } = memory

  // Nothing known, or nothing scheduled: leave what was said standing, and forget what was brewing.
  // Minor delays likewise: not worth a push, and not "good" either, so no all-clear while they last.
  if (state.kind === "unknown" || state.kind === "noService" || (state.kind === "delays" && state.level === "minorDelays")) {
    delete memory.candidate
    return { memory }
  }

  if (state.kind === "good") {
    if (!notified) {
      delete memory.candidate
      return { memory }
    }
    const candidate =
      memory.candidate?.signature === "good" ? memory.candidate : { signature: "good", level: state.level, since: nowMs }
    memory.candidate = candidate
    if (nowMs - candidate.since < CONFIRM_MS) return { memory }
    delete memory.candidate
    delete memory.notified
    return nowMs - notified.at <= CLEARED_WINDOW_MS ? { memory, push: "cleared" } : { memory }
  }

  // Disrupted. The same story, no worse than told: nothing new.
  if (notified && notified.signature === state.signature && compareLevels(state.level, notified.level) <= 0) {
    delete memory.candidate
    return { memory }
  }
  const candidate =
    memory.candidate?.signature === state.signature && compareLevels(memory.candidate.level, state.level) === 0
      ? memory.candidate
      : { signature: state.signature, level: state.level, since: nowMs }
  memory.candidate = candidate
  if (nowMs - candidate.since < CONFIRM_MS) return { memory }

  // Confirmed. A different story at the same level soon after the last push can wait its turn.
  const worse = !notified || compareLevels(state.level, notified.level) > 0
  if (notified && !worse && nowMs - notified.at < MIN_GAP_MS) return { memory }
  delete memory.candidate
  memory.notified = { signature: state.signature, level: state.level, at: nowMs }
  return { memory, push: "disruption" }
}
