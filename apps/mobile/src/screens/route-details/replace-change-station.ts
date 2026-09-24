import { QueryClient } from "react-query"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useSettingsStore } from "@/models"
import { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"

const STALE_TIME = 60_000
// Roughly what fits on screen; each prefetch costs 2–3 rail API calls
const MAX_PREFETCH = 4

// The current route re-planned through `stationId`, keeping the same boarding time
function replacementQuery(stationId: string) {
  const { routeItem, originId, destinationId } = useNavigationParamsStore.getState()
  const { hideSlowTrains } = useSettingsStore.getState()

  const queryKey = ["changeStationReplacement", originId, destinationId, routeItem?.departureTime, hideSlowTrains, stationId]
  const queryFn = async (): Promise<RouteItem | null> => {
    if (!routeItem || !originId || !destinationId) return null
    const [date, hour] = formatDateForAPI(routeItem.departureTime)
    const routes = await new RouteApi().getRoutes(originId, destinationId, date, hour, { hideSlowTrains, viaStation: stationId })

    const sameBoarding = routes.find((route) => route.departureTime === routeItem.departureTime)
    const nextBoarding = routes.find((route) => route.departureTime > routeItem.departureTime)
    return sameBoarding ?? nextBoarding ?? null
  }

  return { queryKey, queryFn }
}

// Warm the cache so picking a station doesn't wait on the multi-leg search
export function prefetchChangeStations(queryClient: QueryClient, stationIds: string[]) {
  for (const stationId of stationIds.slice(0, MAX_PREFETCH)) {
    const { queryKey, queryFn } = replacementQuery(stationId)
    queryClient.prefetchQuery(queryKey, queryFn, { staleTime: STALE_TIME })
  }
}

export async function replaceChangeStation(queryClient: QueryClient, stationId: string): Promise<boolean> {
  const { queryKey, queryFn } = replacementQuery(stationId)
  const replacement = await queryClient.fetchQuery(queryKey, queryFn, {
    staleTime: STALE_TIME,
  })
  if (!replacement) {
    // Don't keep a failed search around, so a retry hits the network again
    queryClient.removeQueries(queryKey, { exact: true })
    return false
  }

  useNavigationParamsStore.getState().setRouteItem({ ...replacement, viaStationId: stationId })
  return true
}
