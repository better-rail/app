import type { RouteItem } from "@/services/api"
import type { RouteApi } from "@/services/api/route-api"
import { publishFreshRoutes } from "@/screens/route-list/route-list-query"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"
import { getSelectedRide } from "@/utils/helpers/ride-helpers"

export async function refetchRideRoute(api: Pick<RouteApi, "getRoutes">, route: RouteItem): Promise<RouteItem | undefined> {
  const originId = route.trains[0].originStationId.toString()
  const destinationId = route.trains[route.trains.length - 1].destinationStationId.toString()
  const [date, time] = formatDateForAPI(route.departureTime)
  const routes = await api.getRoutes(originId, destinationId, date, time, { viaStation: route.viaStationId })

  // A search through a chosen transfer doesn't describe the default route list.
  if (!route.viaStationId) publishFreshRoutes(originId, destinationId, routes)

  const updatedRoute = getSelectedRide(
    routes,
    route.trains.map((train) => train.trainNumber),
  )

  // The API response contains the replanned legs, but not the rider's selection.
  return updatedRoute ? { ...updatedRoute, viaStationId: route.viaStationId } : undefined
}
