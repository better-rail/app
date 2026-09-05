import { parseNaive, type NaiveTime, isSameDay, addDays, hoursOf, naiveFromParts, minutesBetween } from "@/lib/time"
import { getStationById } from "@/data/stations"
import type { ApiTravel, ApiTrain, RouteItem, Train } from "./types"

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

/** URL id for a journey: its train numbers. Unique within a day's results, which is what the `date` param selects. */
export function routeId(trains: Array<Pick<Train, "trainNumber">>): string {
  return trains.map((t) => t.trainNumber).join("-")
}

function formatTrain(train: ApiTrain): Train {
  const scheduledLastStationId = String(
    train.routeStations[train.routeStations.length - 1]?.stationId ?? train.destinationStation,
  )
  const actualLast = train.actualLastStationId !== undefined ? String(train.actualLastStationId) : undefined
  const lastStopId = actualLast && getStationById(actualLast) ? actualLast : scheduledLastStationId

  const stationCancelled = (stationId: number) => train.routeStations.find((s) => s.stationId === stationId)?.cancelled ?? false

  return {
    trainNumber: train.trainNumber,
    originStationId: String(train.orignStation),
    destinationStationId: String(train.destinationStation),
    lastStopId,
    isLastStopChanged: lastStopId !== scheduledLastStationId,
    departureTime: parseNaive(train.departureTime),
    arrivalTime: parseNaive(train.arrivalTime),
    originPlatform: train.originPlatform ?? 0,
    destinationPlatform: train.destPlatform ?? 0,
    originPlatformChanged: train.originPlatformChanged ?? false,
    destinationPlatformChanged: train.destPlatformChanged ?? false,
    delay: train.trainPosition?.calcDiffMinutes ?? 0,
    isCancelled: train.isCancelled ?? false,
    originCancelled: stationCancelled(train.orignStation),
    destinationCancelled: stationCancelled(train.destinationStation),
    stopStations: train.stopStations.map((stop) => ({
      stationId: String(stop.stationId),
      arrivalTime: parseNaive(stop.arrivalTime),
      departureTime: parseNaive(stop.departureTime),
      platform: stop.platform ?? 0,
      platformChanged: stop.platformChanged ?? false,
      cancelled: stop.cancelled ?? false,
    })),
    routeStations: train.routeStations.map((station) => ({
      stationId: String(station.stationId),
      arrivalTime: station.arrivalTime,
      platform: station.platform ?? 0,
      cancelled: station.cancelled ?? false,
    })),
  }
}

/** Keeps today's routes plus the small hours of the next day (00:00–02:00), which riders still think of as "tonight". */
export function belongsToRequestedDay(departureTime: NaiveTime, requestedDate: string): boolean {
  const requested = naiveFromParts(requestedDate, "00:00")
  if (isSameDay(departureTime, requested)) return true
  return isSameDay(departureTime, addDays(requested, 1)) && hoursOf(departureTime) < 2
}

const withinAnHour = (a: NaiveTime, b: NaiveTime) => Math.abs(a - b) <= 59 * MINUTE_MS

// "Much longer": another route leaving within the hour arrives 30+ min sooner (15+ when only this one has a change).
function isMuchLonger(route: RouteItem, others: RouteItem[]): boolean {
  return others.some((other) => {
    if (other === route || !withinAnHour(route.departureTime, other.departureTime)) return false
    const threshold = route.isExchange && !other.isExchange ? 15 : 30
    return route.durationMs - other.durationMs >= threshold * MINUTE_MS
  })
}

function isMuchShorter(route: RouteItem, others: RouteItem[]): boolean {
  return others.some((other) => {
    if (other === route || !withinAnHour(route.departureTime, other.departureTime)) return false
    const threshold = !route.isExchange && other.isExchange ? 15 : 30
    return other.durationMs - route.durationMs >= threshold * MINUTE_MS
  })
}

export function formatTravels(travels: ApiTravel[], requestedDate: string): RouteItem[] {
  const routes: RouteItem[] = travels
    .filter((travel) => travel.trains.length > 0 && belongsToRequestedDay(parseNaive(travel.departureTime), requestedDate))
    .map((travel) => {
      const trains = travel.trains.map(formatTrain)
      const departureTime = parseNaive(travel.departureTime)
      const arrivalTime = parseNaive(travel.arrivalTime)
      return {
        id: routeId(trains),
        departureTime,
        arrivalTime,
        durationMs: arrivalTime - departureTime,
        delay: trains[0].delay,
        isExchange: trains.length > 1,
        isCancelled: trains.some((t) => t.isCancelled || t.originCancelled || t.destinationCancelled),
        isMuchLonger: false,
        isMuchShorter: false,
        trains,
      }
    })
    .sort((a, b) => a.departureTime - b.departureTime)

  return routes.map((route) => ({
    ...route,
    isMuchLonger: isMuchLonger(route, routes),
    isMuchShorter: isMuchShorter(route, routes),
  }))
}

/** Index of the route closest to `time` by departure (or arrival). */
export function closestRouteIndex(routes: RouteItem[], time: NaiveTime, by: "departure" | "arrival" = "departure"): number {
  if (routes.length === 0) return -1
  let best = 0
  let bestDistance = Infinity
  routes.forEach((route, index) => {
    const value = by === "departure" ? route.departureTime : route.arrivalTime
    const distance = Math.abs(value - time)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return best
}

/** First route departing at or after `time` (falls back to the last route). */
export function nextRouteIndex(routes: RouteItem[], time: NaiveTime): number {
  const index = routes.findIndex((route) => route.departureTime + route.delay * MINUTE_MS >= time)
  return index === -1 ? routes.length - 1 : index
}

export function isRouteInThePast(route: RouteItem, now: NaiveTime): boolean {
  return route.arrivalTime + route.delay * MINUTE_MS < now
}

export function routeStops(route: RouteItem): number {
  return route.trains.length - 1
}

export interface RouteSummary {
  count: number
  directCount: number
  firstDeparture: NaiveTime
  lastDeparture: NaiveTime
  medianDurationMs: number
  minDurationMs: number
}

/** Aggregate facts about a day's routes — feeds SEO copy and the "about this route" box. */
export function summarizeRoutes(routes: RouteItem[]): RouteSummary | null {
  if (routes.length === 0) return null
  const durations = routes.map((r) => r.durationMs).sort((a, b) => a - b)
  return {
    count: routes.length,
    directCount: routes.filter((r) => !r.isExchange).length,
    firstDeparture: routes[0].departureTime,
    lastDeparture: routes[routes.length - 1].departureTime,
    medianDurationMs: durations[Math.floor(durations.length / 2)],
    minDurationMs: durations[0],
  }
}

export function exchangeWaitMinutes(first: Train, second: Train): number {
  const arrival = first.arrivalTime + first.delay * MINUTE_MS
  const departure = second.departureTime + second.delay * MINUTE_MS
  return Math.max(1, minutesBetween(arrival, departure))
}

export { HOUR_MS, MINUTE_MS }
