/**
 * timetable.ts — Israel Railways' own timetable compared with the GTFS schedule.
 *
 * Israel Railways does not announce every cancellation, and the SIRI feed only
 * sees a train once it reports. Their timetable search, though, always reflects
 * what they mean to run: a cancelled train drops out of it, a train ending short
 * loses its last stops, an extra train for a concert appears in it. So every few
 * minutes the trains due in the next couple of hours are looked up there and set
 * against the schedule.
 *
 * With the fewest requests: one search between two stations returns every train
 * of the whole day that calls at both, in that order, with each train's full
 * route — so a greedy cover over station pairs (a dozen or so, mostly adjacent
 * hub stations like Savidor → HaShalom) sees every scheduled train at once.
 * Trains are matched by number and departure time across the neighbouring
 * service dates, because the search files a train under the calendar day it
 * leaves the first station of the pair, while the schedule files it under its
 * service date.
 *
 * The pure parts (`coverTrips`, `compareLeg`, `checkResponse`) are tested
 * without a database or the API (tests/timetable-check.test.ts).
 */
import { timetableCheckSeconds, timetableWindowMinutes } from "../data/config"
import { getActiveFeed } from "../db"
import { logNames, logger } from "../logs"
import { type DayTrips, type StopNode, type TripData, loadDayTrips } from "../requests/gtfs-route-api"
import { isRailApiConfigured, searchTrainOnRailApi } from "../requests/rail-api"
import { naiveNowMs } from "../siri/correlate"
import type { RailApiGetRoutesResult, Train } from "../types/rail-response"
import { addDays, toIsoString } from "../utils/gtfs-time"
import { writeTimetableCheck } from "./state"

// --- what the check publishes ----------------------------------------------------------

/** What Israel Railways' timetable says about one scheduled train, when it differs from the schedule. */
export type TripCheck = {
  /** The train is not in Israel Railways' timetable any more. */
  cancelled?: true
  /** Scheduled stops (rail ids) the train no longer calls at, in trip order. */
  skipped?: number[]
  /** The train now ends here (rail id) instead of its scheduled destination. */
  curtailedTo?: number
  /** Israel Railways' own delay estimate (minutes), for the record; delays come from SIRI. */
  delayMin?: number
}

/** A train Israel Railways runs that the schedule does not know. */
export type ExtraTrain = {
  trainNumber: number
  /** The calendar date it leaves its origin. */
  serviceDate: string
  stops: StopNode[]
}

export type TimetableCheck = {
  /** Real epoch ms of the check (staleness). */
  updatedAt: number
  feedId: string
  /** Naive wall-clock ISO bounds of the scheduled departures looked at. */
  window: { from: string; to: string }
  /** How many searches the cover took, and how many of them answered and were trusted. */
  requests: number
  trusted: number
  /** Scheduled trains looked at, and how many the timetable confirmed. */
  scheduled: number
  confirmed: number
  /** Keyed by the schedule's trip key; only trains that differ from it. */
  trains: Record<string, TripCheck>
  extras: ExtraTrain[]
  /** Itinerary notices the timetable attached, deduplicated, for the debug route. */
  messages: { trainNumbers: string; title: string; message: string; severity: number }[]
}

// --- the cover -------------------------------------------------------------------------

export type Pair = { from: number; to: number }

const pairKey = (p: Pair) => `${p.from}-${p.to}`

/** Where a trip calls at `from` and later at `to`; the index of the `from` stop, or -1. */
const stopIndexOfPair = (trip: TripData, pair: Pair): number => {
  const i = trip.stops.findIndex((s) => s.railId === pair.from)
  if (i < 0) return -1
  return trip.stops.slice(i + 1).some((s) => s.railId === pair.to) ? i : -1
}

/**
 * The fewest station pairs whose searches see every given trip: a greedy set cover over
 * every ordered pair of stops any trip makes, largest coverage first.
 */
export const coverTrips = (trips: TripData[]): { pair: Pair; trips: TripData[] }[] => {
  const covers = new Map<string, { pair: Pair; trips: TripData[] }>()
  for (const trip of trips) {
    for (let x = 0; x < trip.stops.length; x++) {
      for (let y = x + 1; y < trip.stops.length; y++) {
        const pair = { from: trip.stops[x].railId, to: trip.stops[y].railId }
        const key = pairKey(pair)
        const entry = covers.get(key) ?? { pair, trips: [] }
        if (!entry.trips.includes(trip)) entry.trips.push(trip)
        covers.set(key, entry)
      }
    }
  }

  const left = new Set(trips)
  const chosen: { pair: Pair; trips: TripData[] }[] = []
  while (left.size > 0) {
    let best: { pair: Pair; trips: TripData[] } | undefined
    let bestCount = 0
    for (const entry of covers.values()) {
      const count = entry.trips.reduce((n, t) => n + (left.has(t) ? 1 : 0), 0)
      if (count > bestCount) {
        best = entry
        bestCount = count
      }
    }
    if (!best) break
    const covered = best.trips.filter((t) => left.has(t))
    for (const t of covered) left.delete(t)
    chosen.push({ pair: best.pair, trips: covered })
  }
  return chosen
}

// --- the comparison --------------------------------------------------------------------

/** A train's departure is matched to the schedule within this. */
const MATCH_TOLERANCE_MS = 15 * 60_000
/** A search missing more than this share of its expected trains is a schedule mismatch, not cancellations. */
const DISTRUST_MISSING_SHARE = 0.3
const DISTRUST_MIN_EXPECTED = 5

const naiveMs = (iso: string): number => Date.parse(`${iso}Z`)

/** The train's stops from the search's route (station ids and "HH:MM" arrivals) as schedule-style stops. */
export const legStops = (leg: Train, serviceDate: string): StopNode[] => {
  const stops: StopNode[] = []
  let day = serviceDate
  let previous = -1
  for (const station of leg.routeStations ?? []) {
    const [h, m] = String(station.arrivalTime).split(":").map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) continue
    const minutes = h * 60 + m
    // Times wrap past midnight along the run.
    if (minutes < previous - 12 * 60) day = addDays(day, 1)
    previous = minutes
    const ts = naiveMs(`${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`)
    stops.push({ railId: Number(station.stationId), platform: Number(station.platform) || 0, arrTs: ts, depTs: ts })
  }
  return stops
}

/**
 * What the timetable's version of a scheduled train says differs: stops it no longer
 * calls at, or an earlier end. A route the schedule does not know (stations the
 * schedule lacks) is a schedule mismatch and yields nothing.
 */
export const compareLeg = (trip: TripData, leg: Train): TripCheck | undefined => {
  const route = (leg.routeStations ?? []).map((s) => Number(s.stationId))
  if (route.length < 2) return undefined
  const scheduled = trip.stops.map((s) => s.railId)
  if (route.some((id) => !scheduled.includes(id))) return undefined

  const check: TripCheck = {}
  const delay = Number(leg.trainPosition?.calcDiffMinutes)
  if (Number.isFinite(delay) && delay > 0) check.delayMin = Math.round(delay)

  const last = route[route.length - 1]
  const lastAt = scheduled.indexOf(last)
  if (last !== scheduled[scheduled.length - 1] && lastAt > 0) check.curtailedTo = last

  const served = new Set(route)
  const end = check.curtailedTo !== undefined ? lastAt : scheduled.length - 1
  const skipped = scheduled.slice(0, end + 1).filter((id) => !served.has(id))
  if (skipped.length > 0) check.skipped = skipped

  return Object.keys(check).length > 0 ? check : undefined
}

export type ResponseCheck = {
  trusted: boolean
  /** Keyed by trip key. */
  trains: Record<string, TripCheck>
  extras: ExtraTrain[]
  confirmed: number
}

/**
 * One search's answer against the trips it was expected to show. A trip with no train of
 * its number leaving the pair's first station near its scheduled time is cancelled; a
 * train of a number the schedule has no trip for near that time is extra. When too many
 * trips are missing the schedule is what is wrong (a feed lagging Israel Railways' changes)
 * and nothing is concluded from that search.
 */
export const checkResponse = (
  pair: Pair,
  serviceDate: string,
  expected: TripData[],
  allTrips: TripData[],
  response: RailApiGetRoutesResult,
  /** Naive epoch bounds on departures from the pair's first station for a train to count as extra. */
  window?: { from: number; to: number },
): ResponseCheck => {
  const legs = (response.result?.travels ?? []).flatMap((t) => t.trains ?? [])
  const byNumber = new Map<number, Train[]>()
  for (const leg of legs) {
    const list = byNumber.get(Number(leg.trainNumber)) ?? []
    list.push(leg)
    byNumber.set(Number(leg.trainNumber), list)
  }

  const legDeparture = (leg: Train): number => naiveMs(String(leg.departureTime).slice(0, 19))
  // A leg leaves from its own origin — the pair's first station for a direct train, but the search
  // also lists legs of connecting itineraries from elsewhere — so the schedule is read at that station.
  const departsLike = (trip: TripData, leg: Train): boolean => {
    const stop = trip.stops.find((s) => s.railId === Number(leg.orignStation))
    return stop !== undefined && Math.abs(legDeparture(leg) - stop.depTs) <= MATCH_TOLERANCE_MS
  }
  const matchedLegs = new Set<Train>()
  const trains: Record<string, TripCheck> = {}
  let confirmed = 0
  let missing = 0

  for (const trip of expected) {
    if (stopIndexOfPair(trip, pair) < 0) continue
    const leg = (byNumber.get(trip.trainNumber) ?? []).find((l) => !matchedLegs.has(l) && departsLike(trip, l))
    if (!leg) {
      missing += 1
      trains[trip.tripKey] = { cancelled: true }
      continue
    }
    matchedLegs.add(leg)
    confirmed += 1
    const diff = compareLeg(trip, leg)
    if (diff) trains[trip.tripKey] = diff
  }

  const trusted = !(missing >= DISTRUST_MIN_EXPECTED && missing / Math.max(1, expected.length) > DISTRUST_MISSING_SHARE)
  if (!trusted) return { trusted, trains: {}, extras: [], confirmed }

  // Trains the schedule has no trip for: by number near the departure, over every loaded date.
  const extras: ExtraTrain[] = []
  const seen = new Set<number>()
  for (const leg of legs) {
    if (matchedLegs.has(leg) || seen.has(Number(leg.trainNumber))) continue
    const dep = legDeparture(leg)
    if (window && (dep < window.from || dep > window.to)) continue
    if (allTrips.some((t) => t.trainNumber === Number(leg.trainNumber) && departsLike(t, leg))) continue
    const stops = legStops(leg, serviceDate)
    if (stops.length < 2) continue
    seen.add(Number(leg.trainNumber))
    extras.push({ trainNumber: Number(leg.trainNumber), serviceDate: toIsoString(stops[0].depTs).slice(0, 10), stops })
  }

  return { trusted, trains, extras, confirmed }
}

// --- one check --------------------------------------------------------------------------

export type CheckDeps = {
  search: (pair: Pair, date: string, hour: string) => Promise<RailApiGetRoutesResult>
  loadTrips: (feedId: string, date: string) => Promise<DayTrips>
  feedId: () => Promise<string | null>
  nowNaiveMs: () => number
  nowRealMs: () => number
  write: (check: TimetableCheck) => Promise<void>
}

const defaultDeps: CheckDeps = {
  search: (pair, date, hour) => searchTrainOnRailApi(pair.from, pair.to, date, hour),
  loadTrips: loadDayTrips,
  feedId: async () => (await getActiveFeed())?.feedId ?? null,
  nowNaiveMs: naiveNowMs,
  nowRealMs: Date.now,
  write: writeTimetableCheck,
}

/** Trains still running, or leaving within the window. */
const WINDOW_BEHIND_MS = 30 * 60_000

/**
 * Look every train due in the window up in Israel Railways' timetable, with as few searches
 * as cover them, and publish what differs from the schedule.
 */
export const runTimetableCheck = async (overrides: Partial<CheckDeps> = {}): Promise<TimetableCheck | null> => {
  const deps = { ...defaultDeps, ...overrides }
  const feedId = await deps.feedId()
  if (!feedId) return null

  const nowNaive = deps.nowNaiveMs()
  const today = toIsoString(nowNaive).slice(0, 10)
  const dates = [addDays(today, -1), today, addDays(today, 1)]
  const days = await Promise.all(dates.map((date) => deps.loadTrips(feedId, date)))
  const allTrips = days.flatMap((day) => [...day.values()]).filter((t) => t.stops.length >= 2)

  const windowFrom = nowNaive - WINDOW_BEHIND_MS
  const windowTo = nowNaive + timetableWindowMinutes * 60_000
  const due = allTrips.filter((t) => {
    const start = t.stops[0].depTs
    const end = t.stops[t.stops.length - 1].arrTs
    return start <= windowTo && end >= windowFrom
  })

  // Each search is filed under the calendar day the train leaves the pair's first station,
  // so a pair straddling midnight takes a search per day.
  const searches: { pair: Pair; date: string; hour: string; trips: TripData[] }[] = []
  for (const { pair, trips } of coverTrips(due)) {
    const byDate = new Map<string, TripData[]>()
    for (const trip of trips) {
      const dep = toIsoString(trip.stops[stopIndexOfPair(trip, pair)].depTs)
      const list = byDate.get(dep.slice(0, 10)) ?? []
      list.push(trip)
      byDate.set(dep.slice(0, 10), list)
    }
    for (const [date, dated] of byDate) {
      const earliest = Math.min(...dated.map((t) => t.stops[stopIndexOfPair(t, pair)].depTs))
      searches.push({ pair, date, hour: toIsoString(earliest).slice(11, 16), trips: dated })
    }
  }

  const check: TimetableCheck = {
    updatedAt: deps.nowRealMs(),
    feedId,
    window: { from: toIsoString(windowFrom), to: toIsoString(windowTo) },
    requests: searches.length,
    trusted: 0,
    scheduled: due.length,
    confirmed: 0,
    trains: {},
    extras: [],
    messages: [],
  }
  const seenMessages = new Set<string>()
  const seenExtras = new Set<string>()

  for (const search of searches) {
    let response: RailApiGetRoutesResult
    try {
      response = await deps.search(search.pair, search.date, search.hour)
    } catch (error) {
      logger?.warn(logNames.timetableCheck.requestFailed, { pair: pairKey(search.pair), date: search.date, error })
      continue
    }
    const result = checkResponse(search.pair, search.date, search.trips, allTrips, response, { from: windowFrom, to: windowTo })
    check.confirmed += result.confirmed
    if (!result.trusted) {
      logger?.warn(logNames.timetableCheck.distrusted, {
        pair: pairKey(search.pair),
        date: search.date,
        expected: search.trips.length,
        confirmed: result.confirmed,
      })
      continue
    }
    check.trusted += 1
    Object.assign(check.trains, result.trains)
    for (const extra of result.extras) {
      const key = `${extra.serviceDate}#${extra.trainNumber}`
      if (seenExtras.has(key)) continue
      seenExtras.add(key)
      check.extras.push(extra)
    }
    for (const travel of response.result?.travels ?? []) {
      for (const m of travel.travelMessages ?? []) {
        const key = `${m?.title}|${m?.message}`
        if (seenMessages.has(key)) continue
        seenMessages.add(key)
        check.messages.push({
          trainNumbers: String(m?.trainNumber ?? ""),
          title: String(m?.title ?? ""),
          message: String(m?.message ?? ""),
          severity: Number(m?.sevirity ?? m?.severity ?? 0),
        })
      }
    }
  }

  await deps.write(check)
  logger?.info(logNames.timetableCheck.checked, {
    requests: check.requests,
    trusted: check.trusted,
    scheduled: check.scheduled,
    confirmed: check.confirmed,
    cancelled: Object.values(check.trains).filter((t) => t.cancelled).length,
    changed: Object.values(check.trains).filter((t) => !t.cancelled).length,
    extras: check.extras.length,
  })
  return check
}

// --- the loop --------------------------------------------------------------------------

const MAX_BACKOFF_MS = 30 * 60_000

let started = false
let consecutiveFailures = 0

const cycle = async () => {
  try {
    await runTimetableCheck()
    if (consecutiveFailures > 0) logger?.info(logNames.timetableCheck.recovered, { afterFailures: consecutiveFailures })
    consecutiveFailures = 0
  } catch (error) {
    consecutiveFailures += 1
    if (consecutiveFailures === 1) logger?.error(logNames.timetableCheck.failed, { error })
  }
  const delay =
    consecutiveFailures === 0
      ? timetableCheckSeconds * 1000
      : Math.min(MAX_BACKOFF_MS, timetableCheckSeconds * 1000 * 2 ** (consecutiveFailures - 1))
  setTimeout(cycle, delay)
}

/** Start comparing Israel Railways' timetable with the schedule, when the rail API is reachable. */
export const startTimetableCheck = () => {
  if (started) return
  started = true
  if (!isRailApiConfigured()) {
    logger?.warn(logNames.timetableCheck.disabled)
    return
  }
  logger?.info(logNames.timetableCheck.started, { everySeconds: timetableCheckSeconds, windowMinutes: timetableWindowMinutes })
  void cycle()
}
