import type { RouteItem } from "@/services/api"

// Shared by the planner's prefetch and the route list, so they hit the same cache entry
export const routeListDayQueryKey = (
  originId: string | undefined,
  destinationId: string | undefined,
  time: number,
  hideSlowTrains: boolean,
) => ["origin", originId, "destination", destinationId, "time", time, "hideSlowTrains", hideSlowTrains]

// Train numbers repeat daily, so the departure time tells days apart
const routeId = (route: RouteItem) => `${route.departureTime}-${route.trains.map((train) => train.trainNumber).join()}`

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
