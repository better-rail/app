/**
 * departures.ts — the next trains calling at a station, per line and direction,
 * for the station card on the app's network map.
 *
 * Read-only like the service status: the day's trips through the planner's cached
 * `loadDayTrips`, the live delays and platforms through the SIRI snapshot. Trips are
 * placed on lines the way the status is (`assignLine`), and on a direction by where
 * they run along the line's corridor. `deriveStationDepartures` is pure, for the tests.
 */
import { getActiveFeed } from "../db"
import { logNames, logger } from "../logs"
import type { DayTrips, TripData } from "../requests/gtfs-route-api"
import { loadTripsAround, serviceDateOf } from "../requests/gtfs-route-api"
import { naiveNowMs } from "../siri/correlate"
import { getRealtimeSnapshot, isSnapshotFresh, makeRealtimeLookup } from "../siri/snapshot"
import type { SiriSnapshot } from "../siri/types"
import type { StationDeparture, StationDepartures, StationLineDepartures } from "../types/station-departures"
import { toIsoString } from "../utils/gtfs-time"
import { RAIL_LINES, type RailLineId, railLineById } from "./lines"
import { assignLine } from "./service-status"

/** How far ahead the board looks. */
const WINDOW_MS = 3 * 60 * 60_000
/** A train that should have left this long ago is still shown, in case it is late without a report. */
const GRACE_MS = 60_000
/** How many trains per direction. */
const PER_DIRECTION = 4
/** Tel Aviv Savidor Center: the dwell is long enough that the meaningful time is the departure (as the planner shows it). */
const SAVIDOR_STATION = 3700

/** Each station's position along each line's corridor, for placing a trip's stops without a scan. */
const corridorIndex = new Map<RailLineId, Map<number, number>>(
  RAIL_LINES.map((line) => [line.id, new Map(line.stationIds.map((id, at) => [Number(id), at]))]),
)

/** The terminus of `line` the trip heads for, from where its stops sit along the corridor. */
const towards = (trip: TripData, lineId: RailLineId): string | undefined => {
  const line = railLineById.get(lineId)
  const index = corridorIndex.get(lineId)
  if (!line || !index) return undefined
  const positions = trip.stops.map((s) => index.get(s.railId)).filter((i): i is number => i !== undefined)
  if (positions.length < 2) return undefined
  const forward = positions[positions.length - 1] > positions[0]
  return forward ? line.stationIds[line.stationIds.length - 1] : line.stationIds[0]
}

export type StationDeparturesInput = {
  trips: DayTrips
  stationId: string
  snapshot: SiriSnapshot | null
  /** Naive Israel wall-clock epoch ms (see siri/correlate.ts naiveNowMs). */
  nowNaiveMs: number
  /** Real epoch ms, compared with the snapshot's updatedAt for staleness. */
  nowRealMs: number
}

export const deriveStationDepartures = (input: StationDeparturesInput): StationDepartures => {
  const { trips, stationId, snapshot, nowNaiveMs, nowRealMs } = input
  const railId = Number(stationId)
  const realtimeAvailable = isSnapshotFresh(snapshot, nowRealMs)
  const lookup = makeRealtimeLookup(snapshot, nowRealMs)

  type Candidate = StationDeparture & { expectedTs: number; lineId: RailLineId; towardsStationId: string }
  const candidates: Candidate[] = []
  for (const trip of trips.values()) {
    // The train must call here and go on somewhere: a train ending here is not a departure.
    const index = trip.stops.findIndex((s) => s.railId === railId)
    if (index < 0 || index >= trip.stops.length - 1) continue
    const lineId = assignLine(trip)
    if (!lineId) continue
    const towardsStationId = towards(trip, lineId)
    if (!towardsStationId) continue

    const stop = trip.stops[index]
    const scheduledTs = railId === SAVIDOR_STATION ? stop.depTs : stop.arrTs
    if (scheduledTs > nowNaiveMs + WINDOW_MS) continue
    const serviceDate = serviceDateOf(trip)
    const rt = lookup(serviceDate, trip.trainNumber, railId)
    const expectedTs = scheduledTs + rt.delayMin * 60_000
    if (expectedTs < nowNaiveMs - GRACE_MS) continue
    const cancelled = rt.trainCancelled === true || rt.status === "cancelled"
    candidates.push({
      trainNumber: trip.trainNumber,
      time: toIsoString(scheduledTs),
      delayMinutes: rt.delayMin,
      platform: rt.platform ?? stop.platform,
      destinationStationId: String(rt.liveDestRailId ?? trip.stops[trip.stops.length - 1].railId),
      cancelled,
      live: realtimeAvailable && snapshot?.trains[`${serviceDate}#${trip.trainNumber}`] !== undefined,
      expectedTs,
      lineId,
      towardsStationId,
    })
  }
  candidates.sort((a, b) => a.expectedTs - b.expectedTs || a.trainNumber - b.trainNumber)

  const lines: StationLineDepartures[] = []
  for (const line of RAIL_LINES) {
    const ofLine = candidates.filter((c) => c.lineId === line.id)
    if (ofLine.length === 0) continue
    // The line's ends, in corridor order, so the directions come out the same way for every station.
    const ends = [line.stationIds[0], line.stationIds[line.stationIds.length - 1]]
    const directions = ends
      .map((towardsStationId) => ({
        towardsStationId,
        trains: ofLine
          .filter((c) => c.towardsStationId === towardsStationId)
          .slice(0, PER_DIRECTION)
          .map(({ expectedTs: _e, lineId: _l, towardsStationId: _t, ...departure }) => departure),
      }))
      .filter((d) => d.trains.length > 0)
    lines.push({ lineId: line.id, directions })
  }

  return {
    schemaVersion: 1,
    stationId,
    generatedAt: new Date(nowRealMs).toISOString(),
    realtime: { available: realtimeAvailable },
    lines,
  }
}

// --- the request-facing wrapper ------------------------------------------------------

const CACHE_TTL_MS = 10_000
const cache = new Map<string, { promise: Promise<StationDepartures | null>; expiresAt: number }>()

const computeStationDepartures = async (stationId: string): Promise<StationDepartures | null> => {
  const feed = await getActiveFeed()
  if (!feed) {
    logger?.error(logNames.gtfs.noActiveFeed)
    return null
  }
  const nowRealMs = Date.now()
  const nowNaiveMs = naiveNowMs()
  const [trips, snapshot] = await Promise.all([loadTripsAround(feed.feedId, nowNaiveMs), getRealtimeSnapshot()])
  return deriveStationDepartures({ trips, stationId, snapshot, nowNaiveMs, nowRealMs })
}

/** The station's next trains, recomputed at most every few seconds. Null when there is no active feed. */
export const getStationDepartures = (stationId: string): Promise<StationDepartures | null> => {
  const now = Date.now()
  const cached = cache.get(stationId)
  if (cached && cached.expiresAt > now) return cached.promise
  const promise = computeStationDepartures(stationId)
  promise.catch(() => cache.delete(stationId)) // don't cache failures
  cache.set(stationId, { promise, expiresAt: now + CACHE_TTL_MS })
  return promise
}
