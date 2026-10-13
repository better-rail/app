import type { RouteItem } from "@/services/api"
import type { RouteSearchResult } from "@/models/train-routes/search-routes"
import type { DateType } from "@/models/route-plan/route-plan"
import { closestIndexTo } from "date-fns"

export type RouteData = RouteItem | string

// Shared by the planner's prefetch and the route list, so they hit the same cache entry
export const routeListDayQueryKey = (
  originId: string | undefined,
  destinationId: string | undefined,
  time: number,
  hideSlowTrains: boolean,
) => ["route-search", originId, destinationId, time, hideSlowTrains]

// Train numbers repeat daily, so the departure time tells days apart
const routeId = (route: RouteItem) => `${route.departureTime}-${route.trains.map((train) => train.trainNumber).join()}`

export function upsertRouteResult(results: RouteSearchResult[], result: RouteSearchResult): RouteSearchResult[] {
  return [...results.filter((existing) => existing.requestedTime !== result.requestedTime), result].sort(
    (a, b) => a.requestedTime - b.requestedTime,
  )
}

export function organizeRouteResults(results: RouteSearchResult[]): RouteData[] {
  // Adjacent service days can both include the same after-midnight departure.
  const routesById = new Map(results.flatMap((result) => result.routes.map((route) => [routeId(route), route] as const)))
  const routes = Array.from(routesById.values()).sort((a, b) => a.departureTime - b.departureTime)
  const data: RouteData[] = []
  let previousDate: string | undefined
  for (const route of routes) {
    const date = new Date(route.trains[0].departureTime).toDateString()
    if (date !== previousDate) data.push(date)
    data.push(route)
    previousDate = date
  }
  return data
}

export function getRouteListWarning(results: RouteSearchResult[]) {
  const result = results.find((result) => result.resultType !== "normal" && result.routes.length > 0)
  if (!result || result.resultType === "normal") return undefined
  return {
    requestedTime: result.requestedTime,
    routesDate: result.routes[0].trains[0].departureTime,
    warningType: result.resultType,
  }
}

export function getInitialScrollIndex(data: RouteData[], time: number, dateType: DateType): number | undefined {
  const routes = data.filter((item): item is RouteItem => typeof item !== "string")
  if (routes.length === 0) return undefined
  const times = routes.map((route) =>
    dateType === "departure" ? route.trains[0].departureTime : route.trains[route.trains.length - 1].arrivalTime,
  )
  const closestIndex = closestIndexTo(time, times)
  if (closestIndex === undefined) return undefined
  const index = data.indexOf(routes[closestIndex])
  // The first train of a later day must never hide the date that tells it apart from today.
  return typeof data[index - 1] === "string" ? index - 1 : index
}

// Merge fresh live data (delays, platforms, cancellations) into matching routes, keeping list-relative flags
export function patchRoutes<T extends RouteItem | string>(items: T[], freshRoutes: RouteItem[]): T[] {
  const freshById = new Map(freshRoutes.map((route) => [routeId(route), route]))
  return items.map((item) => {
    const fresh = typeof item === "string" ? undefined : freshById.get(routeId(item))
    return fresh ? { ...(item as RouteItem), delay: fresh.delay, isCancelled: fresh.isCancelled, trains: fresh.trains } : item
  }) as T[]
}

type FreshRoutesSubscriber = { originId: string; destinationId: string; onRoutes: (routes: RouteItem[]) => void }
const subscribers = new Set<FreshRoutesSubscriber>()

// The timetable API answers with the whole day whatever the hour, so a route details fetch
// is fresh data for the route list, including loaded days its own polling doesn't cover
export function subscribeToFreshRoutes(subscriber: FreshRoutesSubscriber) {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function publishFreshRoutes(originId: string, destinationId: string, routes: RouteItem[]) {
  if (routes.length === 0) return
  for (const subscriber of subscribers) {
    if (subscriber.originId === originId && subscriber.destinationId === destinationId) subscriber.onRoutes(routes)
  }
}
