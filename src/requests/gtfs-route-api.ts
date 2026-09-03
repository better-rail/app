/**
 * gtfs-route-api.ts — GTFS-backed rail timetable search.
 *
 * Replaces the Israel Railways `searchTrainForMobile` call. Given origin/destination
 * 3700-style station IDs and a datetime, it plans upcoming itineraries (direct +
 * transfers) over the rail schedule in Postgres and returns the **exact**
 * `RailApiGetRoutesResult` JSON shape the legacy API produced, so every client
 * keeps working with only a base-URL change.
 *
 * Planning is a marked-station RAPTOR seeded per candidate first-train, which
 * lists trains by departure (the app's UX) while completing each with the
 * earliest-arrival onward journey of at most two transfers. The network is tiny
 * (~70 stations), so a day's trips are cached in-process and scanned directly.
 *
 * Real-time data (delays into trainPosition.calcDiffMinutes, live platform
 * overrides) comes from the SIRI-SM snapshot the poller publishes to redis
 * (see src/siri/) — when no fresh snapshot exists the response is pure schedule
 * (delay 0), which clients already treat as on-time.
 */
import { getActiveFeed, query } from "../db"
import { logNames, logger } from "../logs"
import { getRealtimeSnapshot, makeRealtimeLookup, zeroRealtimeLookup } from "../siri/snapshot"
import type { RealtimeLookup } from "../siri/types"
import { RailApiGetRoutesResult, Train, StopStation, RouteStation } from "../types/rail-response"
import { addDays, parseOffsetSec, railServiceDatesForQuery, toEpochMs } from "../utils/gtfs-time"

const MIN_CONNECTION_MS = 5 * 60 * 1000 // preferred shortest transfer wait
const MIN_CONNECTION_RELAXED_MS = 4 * 60 * 1000 // allowed only to avoid a long wait (see below)
const RELAX_WHEN_WAIT_OVER_MS = 30 * 60 * 1000 // drop to the relaxed minimum only if 5 min would wait longer than this
const MAX_CONNECTION_MS = 45 * 60 * 1000 // longest allowed transfer wait (no long layovers)
// Among itineraries arriving at the same time, prefer fewer changes as long as the
// fewer-change option is at most this much longer than the shortest one.
const PREFER_FEWER_CHANGES_WINDOW_MS = 20 * 60 * 1000
// "Hide slow trains" catch-up rule: a route is hidden when another one leaving
// within this window arrives no more than the tolerance after it — waiting on the
// platform costs a few minutes of arrival at most, so the slower ride is noise.
const CATCH_UP_WAIT_MS = 60 * 60 * 1000
const CATCH_UP_ARRIVAL_TOLERANCE_MS = 15 * 60 * 1000
const MAX_ONWARD_ROUNDS = 2 // first train + 2 onward trips => up to 2 transfers
// The client renders a whole day at once (no intra-day paging), so return the
// full day (midnight to midnight) rather than just the next handful of departures.
// These are safety valves only and must sit above any real single-day volume:
// the busiest station (Tel Aviv Savidor) sees ~420 boardable trains per day.
const MAX_RESULTS = 500
const MAX_FIRST_TRAINS_SCANNED = 1000

// Transfer-station preference (same trains & arrival, but a nicer place to change).
const TLV_STATIONS = new Set([3700, 4600, 4900, 3600]) // Savidor, HaShalom, HaHagana, University
const SAVIDOR_STATION = 3700
const TIGHT_CONNECTION_MS = 6 * 60 * 1000 // a "tight" change
const LONG_CONNECTION_MS = 30 * 60 * 1000 // a "long" change (wait > 30 min)
const SIMILAR_WINDOW_MS = 3 * 60 * 1000 // connection windows within this count as "about the same"

export type StopNode = {
  railId: number
  platform: number
  arrTs: number
  depTs: number
}

export type TripData = {
  tripKey: string
  trainNumber: number
  // Optional so schedule-only fixtures (tests) can omit it; always set when
  // loaded from the DB. The SIRI correlation index matches on it (= LineRef).
  routeId?: string
  stops: StopNode[] // ordered by stop_sequence; only mapped (non-null rail_id) stops
}

export type DayTrips = Map<string, TripData>

export type PlanOptions = {
  // Drop a direct train that a faster direct train (departing later, arriving
  // earlier) shadows. Off by default; set by the app's "hide slow trains" toggle.
  hideSlowTrains?: boolean
}

type Leg = { tripKey: string; boardIndex: number; alightIndex: number }

const toPlatform = (platformCode: string | null): number => {
  if (!platformCode) return 0
  const n = parseInt(platformCode, 10)
  return Number.isFinite(n) ? n : 0
}

// --- per-(feed, service date) trip cache ---------------------------------------

// Cache the in-flight Promise (not the resolved value) so concurrent requests for
// the same (feed, day) collapse onto one DB query instead of stampeding the pool;
// a rejected query is evicted so the next call retries.
const dayCache = new Map<string, Promise<DayTrips>>()
let lastFeedId: string | undefined

const loadDayTrips = (feedId: string, serviceDate: string): Promise<DayTrips> => {
  const cacheKey = `${feedId}#${serviceDate}`
  const cached = dayCache.get(cacheKey)
  if (cached) return cached

  const promise = fetchDayTrips(feedId, serviceDate)
  promise.catch(() => dayCache.delete(cacheKey)) // don't cache failures
  dayCache.set(cacheKey, promise)
  return promise
}

const fetchDayTrips = async (feedId: string, serviceDate: string): Promise<DayTrips> => {
  const { rows } = await query<{
    trip_id: string
    train_number: number
    route_id: string
    stop_sequence: number
    rail_id: number | null
    platform_code: string | null
    arr_offset_sec: number
    dep_offset_sec: number
  }>(
    `SELECT st.trip_id, t.train_number, t.route_id, st.stop_sequence, st.rail_id, st.platform_code,
            st.arr_offset_sec, st.dep_offset_sec
       FROM calendar_dates cd
       JOIN trips t       ON t.feed_id = cd.feed_id AND t.service_id = cd.service_id
       JOIN stop_times st ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
      WHERE cd.feed_id = $1 AND cd.service_date = $2
      ORDER BY st.trip_id, st.stop_sequence`,
    [feedId, serviceDate],
  )

  const trips: DayTrips = new Map()
  for (const row of rows) {
    if (row.rail_id === null) continue // unmapped stop; mapping completeness is enforced at ingest
    const tripKey = `${serviceDate}#${row.trip_id}`
    let trip = trips.get(tripKey)
    if (!trip) {
      trip = { tripKey, trainNumber: row.train_number, routeId: row.route_id, stops: [] }
      trips.set(tripKey, trip)
    }
    trip.stops.push({
      railId: row.rail_id,
      platform: toPlatform(row.platform_code),
      arrTs: toEpochMs(serviceDate, row.arr_offset_sec),
      depTs: toEpochMs(serviceDate, row.dep_offset_sec),
    })
  }
  return trips
}

const invalidateDayCacheForFeed = (feedId: string) => {
  for (const key of dayCache.keys()) {
    if (!key.startsWith(`${feedId}#`)) dayCache.delete(key)
  }
}

// --- planner -------------------------------------------------------------------

/** Earliest-arrival onward journey (<= MAX_ONWARD_ROUNDS transfers) seeded by a first train. */
const completeJourney = (
  allTrips: DayTrips,
  firstTrip: TripData,
  boardIndex: number,
  target: number,
  minConnectionMs: number,
): Leg[] | null => {
  const source = firstTrip.stops[boardIndex].railId
  const bestArr = new Map<number, number>()
  const bestParent = new Map<number, Leg>()
  let marked = new Map<number, number>()

  // Round 0: ride the first train; every downstream stop is reachable "for free".
  for (let j = boardIndex + 1; j < firstTrip.stops.length; j++) {
    const s = firstTrip.stops[j]
    const existing = bestArr.get(s.railId)
    if (existing === undefined || s.arrTs < existing) {
      bestArr.set(s.railId, s.arrTs)
      bestParent.set(s.railId, { tripKey: firstTrip.tripKey, boardIndex, alightIndex: j })
      marked.set(s.railId, s.arrTs)
    }
  }

  for (let round = 1; round <= MAX_ONWARD_ROUNDS; round++) {
    if (marked.size === 0) break
    const nextMarked = new Map<number, number>()
    for (const trip of allTrips.values()) {
      if (trip.tripKey === firstTrip.tripKey) continue
      // earliest stop where a marked station lets us board within the allowed
      // connection window (>= 4 min so the change is feasible, <= 1h so we don't
      // suggest sitting at a station half the night).
      let bIdx = -1
      for (let i = 0; i < trip.stops.length - 1; i++) {
        const ready = marked.get(trip.stops[i].railId)
        if (ready === undefined) continue
        const wait = trip.stops[i].depTs - ready
        if (wait >= minConnectionMs && wait <= MAX_CONNECTION_MS) {
          bIdx = i
          break
        }
      }
      if (bIdx < 0) continue
      for (let j = bIdx + 1; j < trip.stops.length; j++) {
        const s = trip.stops[j]
        const cur = bestArr.get(s.railId)
        if (cur === undefined || s.arrTs < cur) {
          bestArr.set(s.railId, s.arrTs)
          bestParent.set(s.railId, { tripKey: trip.tripKey, boardIndex: bIdx, alightIndex: j })
          nextMarked.set(s.railId, s.arrTs)
        }
      }
    }
    marked = nextMarked
  }

  if (!bestArr.has(target)) return null

  // Reconstruct from target back to source via best parents.
  const legs: Leg[] = []
  let station = target
  let guard = 0
  while (station !== source) {
    const leg = bestParent.get(station)
    if (!leg) return null
    legs.unshift(leg)
    station = allTrips.get(leg.tripKey)!.stops[leg.boardIndex].railId
    if (++guard > MAX_ONWARD_ROUNDS + 2) return null // safety against cycles
  }
  return legs
}

type Boarding = { station: number; window: number; transferTime: number }

/** Is transfer `a` a nicer place to change than `b`? (same trains & arrival either way) */
const isBetterTransfer = (a: Boarding, b: Boarding): boolean => {
  const aTight = a.window <= TIGHT_CONNECTION_MS
  const bTight = b.window <= TIGHT_CONNECTION_MS
  // Avoid a tight change when a roomier one is available.
  if (aTight !== bTight) return !aTight

  // In Tel Aviv, do an "extreme" change at Savidor (the central hub): one that's
  // very tight (<=6 min) or long (both wait > 30 min). This wins over a larger
  // window — for a long wait you'd rather sit at Savidor than another TLV stop.
  const bothLong = a.window > LONG_CONNECTION_MS && b.window > LONG_CONNECTION_MS
  if ((aTight || bothLong) && TLV_STATIONS.has(a.station) && TLV_STATIONS.has(b.station)) {
    const aSavidor = a.station === SAVIDOR_STATION
    const bSavidor = b.station === SAVIDOR_STATION
    if (aSavidor !== bSavidor) return aSavidor
  }

  // A clearly larger connection window is better, otherwise change as early as possible.
  if (Math.abs(a.window - b.window) > SIMILAR_WINDOW_MS) return a.window > b.window
  if (a.transferTime !== b.transferTime) return a.transferTime < b.transferTime
  return a.window > b.window
}

/**
 * Move each change to the nicest station the two trains share, keeping the same
 * trains and arrival time. The journey planner picks transfer points to minimise
 * arrival; this re-picks *where* to change for comfort (larger window > earliest >
 * Savidor for tight Tel Aviv changes). Mutates `legs` in place.
 */
const optimizeTransfers = (allTrips: DayTrips, legs: Leg[], minConnectionMs: number): void => {
  for (let i = 0; i < legs.length - 1; i++) {
    const f1 = allTrips.get(legs[i].tripKey)!
    const f2 = allTrips.get(legs[i + 1].tripKey)!
    const maxAlight2 = legs[i + 1].alightIndex

    // Earliest index F2 stops at each station, before it alights at this leg's end.
    const f2StationIndex = new Map<number, number>()
    for (let p2 = 0; p2 < maxAlight2; p2++) {
      const st = f2.stops[p2].railId
      if (!f2StationIndex.has(st)) f2StationIndex.set(st, p2)
    }

    // Best shared station to change at: ride F1 past its boarding stop, board F2.
    let best: (Boarding & { p1: number; p2: number }) | null = null
    for (let p1 = legs[i].boardIndex + 1; p1 < f1.stops.length; p1++) {
      const st = f1.stops[p1].railId
      const p2 = f2StationIndex.get(st)
      if (p2 === undefined) continue
      const window = f2.stops[p2].depTs - f1.stops[p1].arrTs
      if (window < minConnectionMs || window > MAX_CONNECTION_MS) continue
      const cand = { station: st, window, transferTime: f1.stops[p1].arrTs, p1, p2 }
      if (best === null || isBetterTransfer(cand, best)) best = cand
    }

    if (best) {
      legs[i].alightIndex = best.p1
      legs[i + 1].boardIndex = best.p2
    }
  }
}

const journeyArrivalTs = (allTrips: DayTrips, legs: Leg[]): number => {
  const last = legs[legs.length - 1]
  return allTrips.get(last.tripKey)!.stops[last.alightIndex].arrTs
}

/** Longest wait at any change in the journey. */
const maxConnectionWaitMs = (allTrips: DayTrips, legs: Leg[]): number => {
  let max = 0
  for (let i = 0; i < legs.length - 1; i++) {
    const f1 = allTrips.get(legs[i].tripKey)!
    const f2 = allTrips.get(legs[i + 1].tripKey)!
    const wait = f2.stops[legs[i + 1].boardIndex].depTs - f1.stops[legs[i].alightIndex].arrTs
    if (wait > max) max = wait
  }
  return max
}

const buildTrain = (allTrips: DayTrips, leg: Leg, realtime: RealtimeLookup): Train => {
  const trip = allTrips.get(leg.tripKey)!
  const board = trip.stops[leg.boardIndex]
  const alight = trip.stops[leg.alightIndex]

  // Live data (delay + platform changes) from the SIRI snapshot. Delay is the
  // boarding station's when known, else the train's latest — always vs the
  // *scheduled* time, so it composes with the displayed times below.
  const serviceDate = trip.tripKey.slice(0, trip.tripKey.indexOf("#"))
  const rt = (railId: number) => realtime(serviceDate, trip.trainNumber, railId)
  const livePlatform = (s: StopNode): number => rt(s.railId).platform ?? s.platform
  // A platform "change" needs both sides known: the schedule can be 0 (the
  // best-effort platform fetch missed it) and SIRI only covers monitored stops.
  const platformChanged = (s: StopNode): true | undefined => {
    const live = rt(s.railId).platform
    return live !== undefined && s.platform > 0 && live !== s.platform ? true : undefined
  }
  const stopCancelled = (s: StopNode): true | undefined => (rt(s.railId).status === "cancelled" ? true : undefined)

  // Israel Railways lists arrival_time as the passenger-facing time at every
  // station — the train then dwells until departure_time (e.g. Hadera West arr
  // 09:10 / dep 09:12, and the legacy API/boards show 09:10). The exception is
  // Tel Aviv Savidor Center (the central hub): its dwell is long enough that the
  // meaningful time is when the train leaves, so show departure_time there.
  const displayTs = (s: StopNode): number => (s.railId === SAVIDOR_STATION ? s.depTs : s.arrTs)

  // routeStations = the train's full run (the app indexes origin/dest into this).
  // The legacy API gives routeStations.arrivalTime as a bare "HH:mm" string, which
  // the clients render verbatim — so match that.
  const routeStations: RouteStation[] = trip.stops.map((s) => ({
    stationId: s.railId,
    arrivalTime: localIsoFromTs(displayTs(s)).slice(11, 16),
    crowded: 0,
    platform: livePlatform(s),
    platformChanged: platformChanged(s),
    cancelled: stopCancelled(s),
  }))

  // stopStations = stops strictly between board and alight.
  const stopStations: StopStation[] = trip.stops.slice(leg.boardIndex + 1, leg.alightIndex).map((s) => ({
    stationId: s.railId,
    arrivalTime: localIsoFromTs(displayTs(s)),
    departureTime: localIsoFromTs(displayTs(s)),
    platform: livePlatform(s),
    crowded: 0,
    platformChanged: platformChanged(s),
    cancelled: stopCancelled(s),
  }))

  const boardRt = rt(board.railId)
  return {
    trainNumber: trip.trainNumber,
    orignStation: board.railId,
    destinationStation: alight.railId,
    originPlatform: livePlatform(board),
    destPlatform: livePlatform(alight),
    freeSeats: 0,
    departureTime: localIsoFromTs(displayTs(board)),
    arrivalTime: localIsoFromTs(displayTs(alight)),
    stopStations,
    handicap: 0,
    crowded: 0,
    trainPosition: { calcDiffMinutes: boardRt.delayMin },
    routeStations,
    isCancelled: boardRt.trainCancelled ? true : undefined,
    actualLastStationId: boardRt.liveDestRailId,
    originPlatformChanged: platformChanged(board),
    destPlatformChanged: platformChanged(alight),
  }
}

// epoch ms (already anchored at UTC midnight + offset) -> naive wall-clock ISO
const localIsoFromTs = (ts: number): string => new Date(ts).toISOString().slice(0, 19)

/**
 * Pure planner: produce emulated `travels` for origin->destination from queryTs,
 * over an already-loaded trip table. Lists trains by departure (the app's UX),
 * completing each with the earliest-arrival onward journey (<=2 transfers).
 */
export const planTravels = (
  allTrips: DayTrips,
  fromStation: number,
  toStation: number,
  queryTs: number,
  endTs: number = Infinity,
  realtime: RealtimeLookup = zeroRealtimeLookup,
  options: PlanOptions = {},
): RailApiGetRoutesResult["result"]["travels"] => {
  // Candidate first trains: those boardable at the origin within [queryTs, endTs).
  // endTs bounds the response to the requested day so it doesn't bleed into the
  // next day (which the client loads as a separate page).
  const firstTrains: { tripKey: string; boardIndex: number; depTs: number }[] = []
  for (const trip of allTrips.values()) {
    for (let i = 0; i < trip.stops.length - 1; i++) {
      const stop = trip.stops[i]
      if (stop.railId === fromStation && stop.depTs >= queryTs && stop.depTs < endTs) {
        firstTrains.push({ tripKey: trip.tripKey, boardIndex: i, depTs: stop.depTs })
        break
      }
    }
  }
  firstTrains.sort((a, b) => a.depTs - b.depTs)

  type Candidate = { travel: RailApiGetRoutesResult["result"]["travels"][number]; depTs: number; arrTs: number }
  const candidates: Candidate[] = []
  const seen = new Set<string>()
  let scanned = 0

  // Earliest-arrival onward journey off this first train, with the 5-min minimum
  // connection relaxed to 4 min only when keeping 5 min would force a wait over
  // 30 min (or find nothing) — and only if 4 min actually arrives sooner.
  type Itinerary = { legs: Leg[]; minConnection: number }
  const planOnward = (trip: TripData, boardIndex: number): Itinerary | null => {
    let legs = completeJourney(allTrips, trip, boardIndex, toStation, MIN_CONNECTION_MS)
    let minConnection = MIN_CONNECTION_MS
    if (!legs || maxConnectionWaitMs(allTrips, legs) > RELAX_WHEN_WAIT_OVER_MS) {
      const relaxed = completeJourney(allTrips, trip, boardIndex, toStation, MIN_CONNECTION_RELAXED_MS)
      if (relaxed && (!legs || journeyArrivalTs(allTrips, relaxed) < journeyArrivalTs(allTrips, legs))) {
        legs = relaxed
        minConnection = MIN_CONNECTION_RELAXED_MS
      }
    }
    return legs && legs.length > 0 ? { legs, minConnection } : null
  }

  for (const ft of firstTrains) {
    if (candidates.length >= MAX_RESULTS * 2 || scanned >= MAX_FIRST_TRAINS_SCANNED) break
    scanned++
    const trip = allTrips.get(ft.tripKey)!

    const itineraries: Itinerary[] = []
    const directAlight = trip.stops.findIndex((s, idx) => idx > ft.boardIndex && s.railId === toStation)
    if (directAlight > ft.boardIndex) {
      itineraries.push({
        legs: [{ tripKey: ft.tripKey, boardIndex: ft.boardIndex, alightIndex: directAlight }],
        minConnection: MIN_CONNECTION_MS,
      })
      // Riding a direct train to the end isn't always the best use of it: some take
      // the long way round, and getting off to change arrives sooner (Netivot ->
      // Herzliya, where train 638 loops via the east and a change in Tel Aviv saves
      // ~28 min). Offer that too — the direct train stays listed alongside it.
      const withChange = planOnward(trip, ft.boardIndex)
      const directArrTs = trip.stops[directAlight].arrTs
      if (withChange && withChange.legs.length > 1 && journeyArrivalTs(allTrips, withChange.legs) < directArrTs) {
        itineraries.push(withChange)
      }
    } else {
      const onward = planOnward(trip, ft.boardIndex)
      if (onward) itineraries.push(onward)
    }

    for (const { legs, minConnection } of itineraries) {
      const key = legs.map((l) => allTrips.get(l.tripKey)!.trainNumber).join("-") + "@" + ft.depTs
      if (seen.has(key)) continue
      seen.add(key)

      if (legs.length > 1) optimizeTransfers(allTrips, legs, minConnection)
      const trains = legs.map((leg) => buildTrain(allTrips, leg, realtime))
      const lastLeg = legs[legs.length - 1]
      candidates.push({
        travel: {
          departureTime: trains[0].departureTime,
          arrivalTime: trains[trains.length - 1].arrivalTime,
          freeSeats: 0,
          travelMessages: [],
          trains,
        },
        depTs: ft.depTs,
        arrTs: allTrips.get(lastLeg.tripKey)!.stops[lastLeg.alightIndex].arrTs,
      })
    }
  }

  // Keep a single itinerary per arrival time (drops same-arrival, earlier-departure
  // duplicates). Among those arriving together, prefer the shortest — but if a
  // route with fewer changes arrives at the same time and is at most 20 min longer,
  // prefer it (fewer changes beats a small time saving).
  const changesOf = (c: Candidate) => c.travel.trains.length - 1
  const byArrival = new Map<number, Candidate[]>()
  for (const c of candidates) {
    const list = byArrival.get(c.arrTs)
    if (list) list.push(c)
    else byArrival.set(c.arrTs, [c])
  }

  const chosen: Candidate[] = []
  for (const list of byArrival.values()) {
    const minDuration = Math.min(...list.map((c) => c.arrTs - c.depTs))
    const eligible = list.filter((c) => c.arrTs - c.depTs - minDuration <= PREFER_FEWER_CHANGES_WINDOW_MS)
    eligible.sort((a, b) => changesOf(a) - changesOf(b) || b.depTs - a.depTs)
    chosen.push(eligible[0])
  }

  // Drop dominated itineraries: one that departs no later AND arrives no earlier
  // than another with the same or fewer changes is strictly worse (e.g. leaves
  // earlier but arrives much later). More changes never dominate fewer — a direct
  // train stays listed even when a later departure with a change arrives a few
  // minutes sooner (riders expect to see the direct train). A direct train
  // dominated by another direct train is dropped only with `hideSlowTrains`.
  // Walk latest-departure first, keeping one only if it beats the best arrival
  // so far at its change count or below.
  //
  // `hideSlowTrains` additionally drops a route that a *later* departure catches
  // up with (see isCaughtUp), and one that rides the same first train too far
  // (see sameFirstTrainKey). Nothing is ever hidden because of an earlier
  // departure: a rider standing on the platform can only take what is still to
  // come, so the last slow option before a gap has to stay listed even when the
  // train just before it was far faster.
  chosen.sort((a, b) => b.depTs - a.depTs || a.arrTs - b.arrTs)
  const kept: Candidate[] = []
  const minArrByChanges: number[] = [] // index = change count, value = best arrival among kept
  const minArrByFirstTrain = new Map<string, number>() // best arrival among kept, per first train

  // Two itineraries boarding the same train at the same time differ only in how far
  // you ride it: the "direct" Netivot->Herzliya (train 638, arriving 12:41) is the
  // same 10:43 boarding as changing off it in Tel Aviv (12:13), just 28 min worse.
  // The fewer-changes exception above doesn't apply — there's no earlier departure
  // to trade against, so with `hideSlowTrains` we show only the faster one.
  const sameFirstTrainKey = (c: Candidate) => `${c.travel.trains[0].trainNumber}@${c.depTs}`

  // True when a route already kept leaves within the hour after `c`, needs no more
  // changes, and still arrives within the tolerance of it — take that one instead.
  // `kept` is filled latest-departure first, so its tail holds the departures
  // closest after `c`; stop as soon as one leaves past the wait window.
  const isCaughtUp = (c: Candidate, changes: number) => {
    for (let i = kept.length - 1; i >= 0; i--) {
      const other = kept[i]
      if (other.depTs > c.depTs + CATCH_UP_WAIT_MS) break
      if (changesOf(other) <= changes && other.arrTs <= c.arrTs + CATCH_UP_ARRIVAL_TOLERANCE_MS) return true
    }
    return false
  }

  for (const c of chosen) {
    const changes = changesOf(c)
    const firstTrain = sameFirstTrainKey(c)
    let minArr = Infinity
    for (let k = 0; k <= changes; k++) minArr = Math.min(minArr, minArrByChanges[k] ?? Infinity)
    const keepSlowDirect = changes === 0 && !options.hideSlowTrains
    if (c.arrTs >= minArr && !keepSlowDirect) continue
    if (options.hideSlowTrains) {
      if (isCaughtUp(c, changes)) continue
      // Only against a *kept* route: if the faster ride on this train was itself
      // dropped, this one is the best that's actually listed and has to stay.
      const minArrSameTrain = minArrByFirstTrain.get(firstTrain)
      if (minArrSameTrain !== undefined && minArrSameTrain < c.arrTs) continue
    }
    kept.push(c)
    minArrByChanges[changes] = Math.min(minArrByChanges[changes] ?? Infinity, c.arrTs)
    minArrByFirstTrain.set(firstTrain, Math.min(minArrByFirstTrain.get(firstTrain) ?? Infinity, c.arrTs))
  }

  kept.sort((a, b) => a.depTs - b.depTs)
  return kept.slice(0, MAX_RESULTS).map((c) => c.travel)
}

export type ScheduleType = "ByDeparture" | "ByArrival"

export const searchTrain = async (
  fromStation: number,
  toStation: number,
  date: string,
  _hour: string,
  _scheduleType: ScheduleType = "ByDeparture",
  options: PlanOptions = {},
): Promise<RailApiGetRoutesResult> => {
  const feed = await getActiveFeed()
  if (!feed) {
    logger?.error(logNames.gtfs.noActiveFeed)
    return { result: { travels: [] } }
  }

  // A daily cron ingests a new feed and flips the active one; evict day caches from
  // now-inactive feeds so they don't accumulate for the process lifetime.
  if (lastFeedId !== undefined && lastFeedId !== feed.feedId) {
    invalidateDayCacheForFeed(feed.feedId)
  }
  lastFeedId = feed.feedId

  // Like the legacy Rail API, return the requested day's full timetable from
  // midnight — even for today — ignoring the client's time-of-day. The client
  // renders the whole day and scrolls to the relevant departure itself.
  const effectiveHour = "00:00"

  // Merge the relevant service days into one trip table.
  const serviceDates = railServiceDatesForQuery(date, effectiveHour)
  const allTrips: DayTrips = new Map()
  for (const serviceDate of serviceDates) {
    const dayTrips = await loadDayTrips(feed.feedId, serviceDate)
    for (const [key, trip] of dayTrips) allTrips.set(key, trip)
  }

  const queryTs = toEpochMs(date, parseOffsetSec(effectiveHour))
  const endTs = toEpochMs(addDays(date, 1), 0) // bound results to the requested day

  // Live delays/platforms from the SIRI poller's snapshot in redis. Never
  // rejects; missing/stale snapshots degrade to schedule-only results.
  const realtime = makeRealtimeLookup(await getRealtimeSnapshot())

  // Scheduled platforms are baked into stop_times.platform_code at ingest, so the
  // response already carries them (loadDayTrips reads them) — no per-request API call.
  return { result: { travels: planTravels(allTrips, fromStation, toStation, queryTs, endTs, realtime, options) } }
}

export { invalidateDayCacheForFeed, loadDayTrips }
