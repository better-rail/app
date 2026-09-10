/**
 * service-status.ts — derives the network's health (per line) from the GTFS
 * timetable and the SIRI snapshot, the way TfL's status board does.
 *
 * Read-only by construction: the timetable comes through the planner's cached
 * `loadDayTrips` (SELECT only) and the realtime through `getRealtimeSnapshot`
 * (a redis GET). Nothing is written back anywhere; the result is recomputed on
 * demand and cached in-process for a few seconds.
 *
 * `deriveServiceStatus` is pure — feed it trips, a snapshot and "now" — so the
 * thresholds are testable without a database (see tests/service-status.test.ts).
 */
import { siriStaleSeconds } from "../data/config"
import { getActiveFeed } from "../db"
import { logNames, logger } from "../logs"
import type { DayTrips, StopNode, TripData } from "../requests/gtfs-route-api"
import { loadDayTrips } from "../requests/gtfs-route-api"
import { naiveNowMs } from "../siri/correlate"
import { getRealtimeSnapshot } from "../siri/snapshot"
import type { SiriSnapshot, TrainRealtime } from "../siri/types"
import {
  type AffectedTrain,
  type Disruption,
  type DisruptionSection,
  type LineStatus,
  MINOR_DELAY_MINUTES,
  SEVERE_DELAY_MINUTES,
  SERVICE_STATUS_LEVELS,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
  compareLevels,
} from "../types/service-status"
import { railServiceDatesForQuery, toIsoString } from "../utils/gtfs-time"
import { RAIL_LINES, type RailLineDefinition, type RailLineId } from "./lines"

// --- windows ----------------------------------------------------------------------

/** A train about to leave its origin already counts towards the line's status. */
const DEPARTURE_LOOKAHEAD_MS = 30 * 60_000
/** A line with nothing running and nothing leaving within this window has no service. */
const NO_SERVICE_LOOKAHEAD_MS = 90 * 60_000
/** Once at least this many of the running trains are late, delays are "severe" even when each is short. */
const SEVERE_DELAYED_SHARE = 0.5
const SEVERE_DELAYED_MIN_TRAINS = 3

// --- trip → line assignment --------------------------------------------------------

const lineByTrainNumber = new Map<number, RailLineId>()
for (const line of RAIL_LINES) {
  for (const trainNumber of line.trainNumbers) lineByTrainNumber.set(trainNumber, line.id)
}

const isOrderedSubsequence = (needle: number[], haystack: number[]): boolean => {
  let at = 0
  for (const id of needle) {
    at = haystack.indexOf(id, at)
    if (at < 0) return false
    at += 1
  }
  return true
}

const lineStationNumbers = new Map<RailLineId, number[]>(RAIL_LINES.map((l) => [l.id, l.stationIds.map(Number)]))

/**
 * A trip with an unlisted train number is placed on the shortest line whose
 * corridor contains its whole stop sequence, in either direction. Short
 * Tel Aviv shuttles fit many lines; the shortest is the most specific.
 */
const matchLineByStops = (trip: TripData): RailLineId | undefined => {
  const stops = trip.stops.map((s) => s.railId)
  if (stops.length < 2) return undefined
  const reversed = [...stops].reverse()
  let best: { id: RailLineId; size: number } | undefined
  for (const line of RAIL_LINES) {
    const corridor = lineStationNumbers.get(line.id) ?? []
    if (!isOrderedSubsequence(stops, corridor) && !isOrderedSubsequence(reversed, corridor)) continue
    if (!best || corridor.length < best.size) best = { id: line.id, size: corridor.length }
  }
  return best?.id
}

export const assignLine = (trip: TripData): RailLineId | undefined =>
  lineByTrainNumber.get(trip.trainNumber) ?? matchLineByStops(trip)

// --- per-trip realtime view ----------------------------------------------------------

type TripView = {
  trip: TripData
  serviceDate: string
  delayMin: number
  cancelled: boolean
  /** Station ids (numbers) of stops the train will skip, in trip order. */
  skipped: number[]
  /** Where the run now ends when SIRI reports a different last stop. */
  curtailedTo?: number
  /** First stop the train has not reached yet (schedule + delay). */
  nextStop?: StopNode
  /** Scheduled origin departure. */
  startTs: number
  /** Expected destination arrival (schedule + delay). */
  endTs: number
}

const serviceDateOf = (trip: TripData): string => trip.tripKey.slice(0, trip.tripKey.indexOf("#"))

const viewTrip = (trip: TripData, realtime: TrainRealtime | undefined, nowMs: number): TripView => {
  const serviceDate = serviceDateOf(trip)
  const first = trip.stops[0]
  const last = trip.stops[trip.stops.length - 1]
  // Israel Railways trains don't run early; negative predictions are noise (same clamp as the planner).
  const delayMin = Math.max(0, realtime?.latestDelayMin ?? 0)
  const delayMs = delayMin * 60_000
  const cancelled = realtime?.cancelled === true

  const skipped: number[] = []
  if (realtime && !cancelled) {
    for (const stop of trip.stops) {
      if (realtime.stations[stop.railId]?.status === "cancelled") skipped.push(stop.railId)
    }
  }

  const liveDest = realtime?.liveDestRailId
  const curtailedTo =
    liveDest !== undefined && liveDest !== last.railId && trip.stops.some((s) => s.railId === liveDest) ? liveDest : undefined

  return {
    trip,
    serviceDate,
    delayMin,
    cancelled,
    skipped,
    curtailedTo,
    nextStop: trip.stops.find((s) => s.arrTs + delayMs >= nowMs),
    startTs: first.depTs,
    endTs: last.arrTs + delayMs,
  }
}

const stationId = (railId: number): string => String(railId)

const toAffectedTrain = (view: TripView, status: AffectedTrain["status"]): AffectedTrain => {
  const { trip } = view
  const first = trip.stops[0]
  const last = trip.stops[trip.stops.length - 1]
  const train: AffectedTrain = {
    trainNumber: trip.trainNumber,
    status,
    originStationId: stationId(first.railId),
    destinationStationId: stationId(last.railId),
    departureTime: toIsoString(first.depTs),
    arrivalTime: toIsoString(last.arrTs),
    delayMinutes: view.delayMin,
  }
  if (view.nextStop && status !== "cancelled") train.nextStationId = stationId(view.nextStop.railId)
  if (status === "curtailed" && view.curtailedTo !== undefined) train.actualDestinationStationId = stationId(view.curtailedTo)
  if (status === "skippingStops") train.skippedStationIds = view.skipped.map(stationId)
  return train
}

// --- sections ----------------------------------------------------------------------

/** The contiguous stretch of the line covering every given station, in line order. */
const sectionOf = (line: RailLineDefinition, railIds: Iterable<number>): DisruptionSection | null => {
  let lo = Number.POSITIVE_INFINITY
  let hi = Number.NEGATIVE_INFINITY
  for (const railId of railIds) {
    const at = line.stationIds.indexOf(stationId(railId))
    if (at < 0) continue
    lo = Math.min(lo, at)
    hi = Math.max(hi, at)
  }
  if (!Number.isFinite(lo)) return null
  const stationIds = line.stationIds.slice(lo, hi + 1)
  return { fromStationId: stationIds[0], toStationId: stationIds[stationIds.length - 1], stationIds }
}

/** The stops of a curtailed run that will not be served: everything after the live destination. */
const unservedStops = (view: TripView): number[] => {
  const at = view.trip.stops.findIndex((s) => s.railId === view.curtailedTo)
  return at < 0 ? [] : view.trip.stops.slice(at + 1).map((s) => s.railId)
}

const sectionKey = (section: DisruptionSection | null): string =>
  section ? `${section.fromStationId}-${section.toStationId}` : "line"

// --- per-line derivation -----------------------------------------------------------

const lineEcho = (line: RailLineDefinition): LineStatus["line"] => ({
  badge: line.badge,
  color: line.color,
  name: line.name,
  stationIds: line.stationIds,
})

const deriveLine = (line: RailLineDefinition, views: TripView[], nowMs: number, realtimeAvailable: boolean): LineStatus => {
  const active = views.filter((v) => v.startTs - DEPARTURE_LOOKAHEAD_MS <= nowMs && nowMs <= v.endTs)
  const hasUpcoming = views.some((v) => v.startTs > nowMs && v.startTs - NO_SERVICE_LOOKAHEAD_MS <= nowMs)

  const running = active.filter((v) => !v.cancelled)
  const delayed = running.filter((v) => v.delayMin >= MINOR_DELAY_MINUTES)
  const cancelled = active.filter((v) => v.cancelled)
  const maxDelayMinutes = running.reduce((max, v) => Math.max(max, v.delayMin), 0)

  const base: Omit<LineStatus, "level" | "disruptions"> = {
    lineId: line.id,
    trains: { active: active.length, delayed: delayed.length, cancelled: cancelled.length, maxDelayMinutes },
    line: lineEcho(line),
  }

  if (active.length === 0) {
    return { ...base, level: hasUpcoming ? (realtimeAvailable ? "goodService" : "unknown") : "noService", disruptions: [] }
  }
  if (!realtimeAvailable) return { ...base, level: "unknown", disruptions: [] }

  const disruptions: Disruption[] = []

  // Every train on the line is cancelled — nothing runs.
  if (cancelled.length >= 2 && cancelled.length === active.length) {
    const section = sectionOf(line, line.stationIds.map(Number))
    disruptions.push({
      id: `suspension:${sectionKey(section)}`,
      kind: "suspension",
      level: "suspended",
      section,
      trains: cancelled.map((v) => toAffectedTrain(v, "cancelled")),
    })
    return { ...base, level: "suspended", disruptions }
  }

  // Runs ending short of their scheduled destination: the stretch beyond is unserved.
  const curtailed = running.filter((v) => v.curtailedTo !== undefined)
  const bySection = new Map<string, { section: DisruptionSection | null; trains: AffectedTrain[] }>()
  for (const view of curtailed) {
    const section = sectionOf(line, unservedStops(view))
    const key = sectionKey(section)
    const group = bySection.get(key) ?? { section, trains: [] }
    group.trains.push(toAffectedTrain(view, "curtailed"))
    bySection.set(key, group)
  }
  for (const [key, group] of bySection) {
    disruptions.push({
      id: `curtailment:${key}`,
      kind: "curtailment",
      level: "partSuspended",
      section: group.section,
      trains: group.trains,
    })
  }

  // Cancelled runs: one is a severe disruption, two or more with a common stretch mean that stretch is not served.
  if (cancelled.length > 0) {
    let section: DisruptionSection | null = null
    if (cancelled.length >= 2) {
      const positions = cancelled.map((v) => new Set(v.trip.stops.map((s) => s.railId)))
      const shared = [...positions[0]].filter((railId) => positions.every((p) => p.has(railId)))
      section = sectionOf(line, shared)
    }
    disruptions.push({
      id: `cancellations:${sectionKey(section)}`,
      kind: "cancellations",
      level: cancelled.length >= 2 ? "partSuspended" : "severeDelays",
      section,
      trains: cancelled.map((v) => toAffectedTrain(v, "cancelled")),
    })
  }

  // Trains skipping stops: the skipped stations are flagged, service otherwise runs.
  const skipping = running.filter((v) => v.skipped.length > 0)
  if (skipping.length > 0) {
    const section = sectionOf(
      line,
      skipping.flatMap((v) => v.skipped),
    )
    disruptions.push({
      id: `skippedStops:${sectionKey(section)}`,
      kind: "skippedStops",
      level: "minorDelays",
      section,
      trains: skipping.map((v) => toAffectedTrain(v, "skippingStops")),
    })
  }

  if (delayed.length > 0) {
    const widespread = delayed.length >= SEVERE_DELAYED_MIN_TRAINS && delayed.length / running.length >= SEVERE_DELAYED_SHARE
    const severe = maxDelayMinutes >= SEVERE_DELAY_MINUTES || widespread
    disruptions.push({
      id: "delays",
      kind: "delays",
      level: severe ? "severeDelays" : "minorDelays",
      section: null,
      trains: [...delayed].sort((a, b) => b.delayMin - a.delayMin).map((v) => toAffectedTrain(v, "delayed")),
    })
  }

  disruptions.sort((a, b) => compareLevels(b.level, a.level))
  const level = disruptions.reduce<ServiceStatusLevel>(
    (worst, d) => (compareLevels(d.level, worst) > 0 ? d.level : worst),
    "goodService",
  )
  return { ...base, level, disruptions }
}

// --- the pure derivation ------------------------------------------------------------

export type ServiceStatusInput = {
  trips: DayTrips
  snapshot: SiriSnapshot | null
  /** Naive Israel wall-clock epoch ms (see siri/correlate.ts naiveNowMs). */
  nowNaiveMs: number
  /** Real epoch ms, compared with the snapshot's updatedAt for staleness. */
  nowRealMs: number
  /** The Israel civil date the status is for ("YYYY-MM-DD"). */
  serviceDate: string
}

const emptyCounts = (): Record<ServiceStatusLevel, number> =>
  Object.fromEntries(SERVICE_STATUS_LEVELS.map((level) => [level, 0])) as Record<ServiceStatusLevel, number>

export const deriveServiceStatus = (input: ServiceStatusInput): ServiceStatusSnapshot => {
  const { trips, snapshot, nowNaiveMs, nowRealMs, serviceDate } = input
  const realtimeAvailable = snapshot !== null && nowRealMs - snapshot.updatedAt <= siriStaleSeconds * 1000

  const viewsByLine = new Map<RailLineId, TripView[]>(RAIL_LINES.map((l) => [l.id, []]))
  for (const trip of trips.values()) {
    if (trip.stops.length < 2) continue
    const lineId = assignLine(trip)
    if (!lineId) continue
    const realtime = snapshot?.trains[`${serviceDateOf(trip)}#${trip.trainNumber}`]
    viewsByLine.get(lineId)?.push(viewTrip(trip, realtime, nowNaiveMs))
  }

  const lines = RAIL_LINES.map((line) => deriveLine(line, viewsByLine.get(line.id) ?? [], nowNaiveMs, realtimeAvailable))

  const counts = emptyCounts()
  let network: ServiceStatusLevel = "noService"
  for (const line of lines) {
    counts[line.level] += 1
    if (line.level === "noService") continue
    if (network === "noService" || compareLevels(line.level, network) > 0) network = line.level
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date(nowRealMs).toISOString(),
    serviceDate,
    realtime: { available: realtimeAvailable, updatedAt: snapshot ? new Date(snapshot.updatedAt).toISOString() : null },
    network: { level: network, counts },
    lines,
  }
}

// --- the request-facing wrapper ------------------------------------------------------

const STATUS_CACHE_TTL_MS = 10_000
let statusCache: { promise: Promise<ServiceStatusSnapshot | null>; expiresAt: number } | undefined

const computeServiceStatus = async (): Promise<ServiceStatusSnapshot | null> => {
  const feed = await getActiveFeed()
  if (!feed) {
    logger?.error(logNames.gtfs.noActiveFeed)
    return null
  }

  const nowRealMs = Date.now()
  const nowNaiveMs = naiveNowMs()
  const nowIso = toIsoString(nowNaiveMs)
  const serviceDate = nowIso.slice(0, 10)

  // Today plus the neighbouring service days the planner would load: late trains
  // of yesterday still run after midnight, and tomorrow's first departures matter
  // for the "no service" call late in the evening.
  const serviceDates = railServiceDatesForQuery(serviceDate, nowIso.slice(11, 16))
  const [days, snapshot] = await Promise.all([
    Promise.all(serviceDates.map((date) => loadDayTrips(feed.feedId, date))),
    getRealtimeSnapshot(),
  ])
  const trips: DayTrips = new Map()
  for (const day of days) for (const [key, trip] of day) trips.set(key, trip)

  return deriveServiceStatus({ trips, snapshot, nowNaiveMs, nowRealMs, serviceDate })
}

/** The current status, recomputed at most every few seconds. Null when there is no active feed. */
export const getServiceStatus = (): Promise<ServiceStatusSnapshot | null> => {
  const now = Date.now()
  if (statusCache && statusCache.expiresAt > now) return statusCache.promise
  const promise = computeServiceStatus()
  promise.catch(() => {
    statusCache = undefined // don't cache failures
  })
  statusCache = { promise, expiresAt: now + STATUS_CACHE_TTL_MS }
  return promise
}
