import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useSettingsStore } from "@/models"
import { RouteApi } from "@/services/api/route-api"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"

// Re-plan the current route through `stationId`, keeping the same boarding time
export async function replaceChangeStation(stationId: string): Promise<boolean> {
  const { routeItem, originId, destinationId, setRouteItem } = useNavigationParamsStore.getState()
  if (!routeItem || !originId || !destinationId) return false

  const [date, hour] = formatDateForAPI(routeItem.departureTime)
  const { hideSlowTrains } = useSettingsStore.getState()
  const routes = await new RouteApi().getRoutes(originId, destinationId, date, hour, { hideSlowTrains, viaStation: stationId })

  const sameBoarding = routes.find((route) => route.departureTime === routeItem.departureTime)
  const nextBoarding = routes.find((route) => route.departureTime > routeItem.departureTime)
  const replacement = sameBoarding ?? nextBoarding
  if (!replacement) return false

  setRouteItem({ ...replacement, viaStationId: stationId })
  return true
}
