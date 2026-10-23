import { queryOptions } from "@tanstack/react-query"
import { findRoutes, apiHourFor } from "./find-routes"
import { dateKey, naiveNow } from "@/lib/time"
import type { RoutesSearch } from "./types"

export const ROUTES_REFETCH_INTERVAL_MS = 60_000
/** Today's timetable carries live delays and platforms, so it goes stale quickly; a later day's changes by the hour. */
const TODAY_STALE_MS = 30_000
const FUTURE_STALE_MS = 10 * 60_000

export function routesQueryOptions(search: RoutesSearch) {
  const normalized: RoutesSearch = { ...search, hour: apiHourFor(search.hour), hideSlowTrains: Boolean(search.hideSlowTrains) }
  return queryOptions({
    queryKey: [
      "routes",
      normalized.originId,
      normalized.destinationId,
      normalized.date,
      normalized.hour,
      normalized.hideSlowTrains,
    ],
    queryFn: () => findRoutes({ data: normalized }),
    staleTime: normalized.date === dateKey(naiveNow()) ? TODAY_STALE_MS : FUTURE_STALE_MS,
    gcTime: 30 * 60_000,
    // One more go in the browser; on the server the page is waiting, and it renders its own retry button.
    retry: import.meta.env.SSR ? 0 : 1,
  })
}
