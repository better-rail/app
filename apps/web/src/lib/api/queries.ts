import { queryOptions } from "@tanstack/react-query"
import { findRoutes, apiHourFor } from "./find-routes"
import type { RoutesSearch } from "./types"

export const ROUTES_REFETCH_INTERVAL_MS = 60_000

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
    staleTime: 30_000,
    gcTime: 30 * 60_000,
    retry: 1,
  })
}
