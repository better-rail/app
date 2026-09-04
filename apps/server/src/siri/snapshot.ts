/**
 * snapshot.ts — the realtime state shared between the SIRI poller and the web
 * service, via redis.
 *
 * The poller (its own Railway service — only its egress IP is allow-listed by
 * MOT) publishes a compact snapshot every cycle; the web service reads it with
 * a short in-process cache and turns it into a synchronous lookup the planner
 * calls per train/station. Everything here degrades to schedule-only results:
 * no redis, no snapshot, or a stale snapshot all yield delay 0 + scheduled
 * platforms — exactly the pre-SIRI behavior.
 */
import { siriCarrySeconds, siriStaleSeconds } from "../data/config"
import { getRedisClient } from "../data/redis"
import { logNames, logger } from "../logs"
import type { TripRef } from "./correlate"
import type { RealtimeLookup, SiriSnapshot, StationRealtime, TrainRealtime, UnmatchedSample } from "./types"

export const SNAPSHOT_KEY = "siri:snapshot"
export const STATUS_KEY = "siri:status"
export const RAW_KEY = "siri:raw"
export const UNMATCHED_KEY = "siri:unmatched"

// The lookup already refuses snapshots older than siriStaleSeconds; the TTL is
// just the backstop that clears state when the poller is gone for good.
const SNAPSHOT_TTL_SEC = 900
const DEBUG_TTL_SEC = 1800

/** A visit that correlated to a GTFS trip, ready for delay math. */
export type MatchedVisit = {
  tripRef: TripRef
  /** The monitored station (rail_id). */
  railId: number
  /** ExpectedArrivalTime in naive epoch ms, when present. */
  expectedArrNaive: number | null
  status?: string
  platform?: number
  /** The journey's live DestinationRef resolved to a rail_id, when it mapped. */
  destRailId?: number
  location?: { lat: number; lon: number }
  vehicleRef?: string
}

const usableDelay = (m: MatchedVisit, schedArr: number | undefined): number | null => {
  // Cancelled/noReport predictions are unreliable; `arrived` and the rest are fine.
  if (m.expectedArrNaive === null || schedArr === undefined) return null
  if (m.status === "cancelled" || m.status === "noReport") return null
  return Math.round((m.expectedArrNaive - schedArr) / 60_000)
}

/**
 * The feed is forward-looking (StartTime = now + PreviewInterval), so a visit
 * disappears the moment its train departs the stop — and the whole train once
 * the run is over. Rebuilding from live visits alone would revert departed
 * stops to schedule-only within one poll (a platform change un-flags right as
 * the train leaves). Carry the previous snapshot's entries into the gaps: live
 * data always wins, carried entries are stamped with seenAt and dropped once
 * they're siriCarrySeconds old.
 */
const carryForward = (trains: Record<string, TrainRealtime>, previous: SiriSnapshot | null | undefined, nowNaiveMs: number) => {
  if (!previous) return
  const expired = (s: StationRealtime) => s.seenAt !== undefined && nowNaiveMs - s.seenAt > siriCarrySeconds * 1000
  const carry = (s: StationRealtime): StationRealtime => (s.seenAt === undefined ? { ...s, seenAt: nowNaiveMs } : s)

  for (const [key, prevTrain] of Object.entries(previous.trains)) {
    const train = trains[key]
    if (train) {
      // Still live. The train-level fields stay live-derived, with two guards
      // against the evidence window shrinking as visits age out:
      // a cancelled run keeps losing monitored visits, so once fewer than 2
      // remain the 2+ rule above can't see the cancellation anymore — keep it
      // while no live station contradicts it (an un-cancelled run reports
      // onTime again and clears the flag);
      const liveStations = Object.values(train.stations)
      if (prevTrain.cancelled && !train.cancelled && liveStations.every((s) => s.status === "cancelled")) train.cancelled = true
      // and when every live delay is unusable (cancelled/noReport blackout),
      // the previous train-level delay beats reverting to 0.
      if (liveStations.every((s) => s.delayMin === null)) train.latestDelayMin = prevTrain.latestDelayMin

      // Fill only the stations the feed no longer reports (departed stops).
      for (const [railId, station] of Object.entries(prevTrain.stations)) {
        if (train.stations[railId] !== undefined || expired(station)) continue
        train.stations[railId] = carry(station)
      }
    } else {
      // The train left the feed entirely: freeze its last-known state — delays,
      // platforms, statuses, cancellation, live destination — until every
      // station entry has expired.
      const stations: Record<string, StationRealtime> = {}
      for (const [railId, station] of Object.entries(prevTrain.stations)) {
        if (!expired(station)) stations[railId] = carry(station)
      }
      if (Object.keys(stations).length > 0) trains[key] = { ...prevTrain, ended: true, stations }
    }
  }
}

export const buildSnapshot = (
  matched: MatchedVisit[],
  feedId: string,
  nowNaiveMs: number,
  previous?: SiriSnapshot | null,
): SiriSnapshot => {
  const trains: Record<string, TrainRealtime> = {}

  for (const m of matched) {
    const key = `${m.tripRef.serviceDate}#${m.tripRef.trainNumber}`
    let train = trains[key]
    if (!train) {
      train = { routeId: m.tripRef.routeId, latestDelayMin: 0, stations: {} }
      trains[key] = train
    }

    const station: StationRealtime = {
      delayMin: usableDelay(m, m.tripRef.arrByRailId.get(m.railId)),
      status: m.status,
    }
    if (m.expectedArrNaive !== null) station.expectedArr = m.expectedArrNaive
    if (m.platform !== undefined) station.platform = m.platform
    train.stations[m.railId] = station

    // A DestinationRef that maps to a known station but not the scheduled last
    // stop means the run was curtailed/extended — surface the live last stop.
    if (m.destRailId !== undefined && m.destRailId !== m.tripRef.destRailId) train.liveDestRailId = m.destRailId

    if (m.location) train.location = m.location
    if (m.vehicleRef) train.vehicleRef = m.vehicleRef
  }

  // Train-level delay = the nearest upcoming monitored stop's delay (the value
  // mid-ride lookups fall back to once the boarding station's visit is gone).
  for (const train of Object.values(trains)) {
    let upcoming: StationRealtime | undefined
    let past: StationRealtime | undefined
    for (const station of Object.values(train.stations)) {
      if (station.delayMin === null || station.expectedArr === undefined) continue
      if (station.expectedArr >= nowNaiveMs) {
        if (!upcoming || station.expectedArr < upcoming.expectedArr!) upcoming = station
      } else if (!past || station.expectedArr > past.expectedArr!) {
        past = station
      }
    }
    train.latestDelayMin = (upcoming ?? past)?.delayMin ?? 0

    // Whole-run cancellation: every monitored station reports cancelled. Require
    // 2+ stations so a single skipped stop (or a lone visit at the preview-window
    // edge) doesn't read as a full cancellation — per-station statuses carry those.
    const stations = Object.values(train.stations)
    if (stations.length >= 2 && stations.every((s) => s.status === "cancelled")) train.cancelled = true
  }

  carryForward(trains, previous, nowNaiveMs)

  return { updatedAt: Date.now(), feedId, trains }
}

// --- redis IO ----------------------------------------------------------------------

const setKey = async (key: string, value: string, ttlSec: number) => {
  try {
    await getRedisClient()?.set(key, value, { EX: ttlSec })
  } catch (error) {
    logger?.error(logNames.siri.snapshotWriteFailed, { error, key })
  }
}

export const writeSnapshot = (snapshot: SiriSnapshot) => setKey(SNAPSHOT_KEY, JSON.stringify(snapshot), SNAPSHOT_TTL_SEC)

export const writeStatus = (status: Record<string, unknown>) => setKey(STATUS_KEY, JSON.stringify(status), DEBUG_TTL_SEC)

export const writeUnmatched = (samples: UnmatchedSample[]) => setKey(UNMATCHED_KEY, JSON.stringify(samples), DEBUG_TTL_SEC)

/** Keep the last poll's raw chunk bodies for fixture capture, capped in size. */
export const writeRaw = (rawChunks: string[], capBytes = 4_000_000) => {
  const kept: { chunk: number; truncated: boolean; body: string }[] = []
  let budget = capBytes
  for (let i = 0; i < rawChunks.length; i++) {
    const body = rawChunks[i].slice(0, Math.max(0, budget))
    kept.push({ chunk: i, truncated: body.length < rawChunks[i].length, body })
    budget -= body.length
    if (budget <= 0) break
  }
  return setKey(RAW_KEY, JSON.stringify(kept), DEBUG_TTL_SEC)
}

/** Uncached read — the poller seeds its carry-forward baseline from this after a restart. */
export const readSnapshot = async (): Promise<SiriSnapshot | null> => {
  try {
    const raw = await getRedisClient()?.get(SNAPSHOT_KEY)
    return raw ? (JSON.parse(raw) as SiriSnapshot) : null
  } catch (error) {
    logger?.error(logNames.siri.snapshotReadFailed, { error })
    return null
  }
}

// Cache the in-flight promise so a request burst does one redis read per 5s
// window (same pattern as activeFeedCache in db/index.ts). Never rejects.
let snapshotCache: { promise: Promise<SiriSnapshot | null>; expiresAt: number } | undefined
const SNAPSHOT_CACHE_TTL_MS = 5_000

export const getRealtimeSnapshot = (): Promise<SiriSnapshot | null> => {
  const now = Date.now()
  if (snapshotCache && snapshotCache.expiresAt > now) return snapshotCache.promise
  const promise = readSnapshot()
  snapshotCache = { promise, expiresAt: now + SNAPSHOT_CACHE_TTL_MS }
  return promise
}

// --- the planner-facing lookup ------------------------------------------------------

export const zeroRealtimeLookup: RealtimeLookup = () => ({ delayMin: 0 })

export const makeRealtimeLookup = (snapshot: SiriSnapshot | null, nowMs = Date.now()): RealtimeLookup => {
  // A stale snapshot means the poller is down; last-known delays are served up
  // to siriStaleSeconds, after which we revert to schedule-only rather than
  // keep showing hours-old predictions.
  if (!snapshot || nowMs - snapshot.updatedAt > siriStaleSeconds * 1000) return zeroRealtimeLookup

  return (serviceDate, trainNumber, railId) => {
    const train = snapshot.trains[`${serviceDate}#${trainNumber}`]
    if (!train) return { delayMin: 0 }
    const station = train.stations[railId]
    // Carried entries (seenAt) keep platform/status alive after the visit left
    // the feed, but their delay is history: while the train is still running
    // the train-level delay is the current one, so it stays authoritative for
    // departed stops. Once the run is over (ended), the per-station record is
    // the best answer there is.
    const stationDelay = station === undefined || (station.seenAt !== undefined && !train.ended) ? null : station.delayMin
    const raw = stationDelay ?? train.latestDelayMin
    // IR trains don't run early; negative predictions are noise — clamp.
    return {
      delayMin: Math.max(0, raw),
      platform: station?.platform,
      status: station?.status,
      trainCancelled: train.cancelled,
      liveDestRailId: train.liveDestRailId,
    }
  }
}
