import type { QueryClient } from "react-query"
import type { RouteItem } from "@/services/api"

export const routeListQueryKey = (originId?: string, destinationId?: string) => ["origin", originId, "destination", destinationId]

// Shared by the planner's prefetch and the route list, so they hit the same cache entry
export const routeListDayQueryKey = (
  originId: string | undefined,
  destinationId: string | undefined,
  time: number,
  hideSlowTrains: boolean,
) => [...routeListQueryKey(originId, destinationId), "time", time, "hideSlowTrains", hideSlowTrains]

// Train numbers repeat daily, so the departure time tells cached days apart
const routeId = (route: RouteItem) => `${route.departureTime}-${route.trains.map((train) => train.trainNumber).join()}`

// The timetable API answers with the whole day whatever the hour, so a route details
// fetch is fresh data for the entire list: push its delays and platforms into the cached lists
export function patchRouteList(queryClient: QueryClient, originId: string, destinationId: string, freshRoutes: RouteItem[]) {
  if (freshRoutes.length === 0) return
  const freshById = new Map(freshRoutes.map((route) => [routeId(route), route]))
  const patch = (route: RouteItem) => {
    const fresh = freshById.get(routeId(route))
    return fresh ? { ...route, delay: fresh.delay, isCancelled: fresh.isCancelled, trains: fresh.trains } : route
  }

  // Not setQueriesData: it would flip a list that never loaded to success with undefined data
  for (const [queryKey, routes] of queryClient.getQueriesData<RouteItem[]>(routeListQueryKey(originId, destinationId))) {
    if (routes) queryClient.setQueryData(queryKey, routes.map(patch))
  }
}
