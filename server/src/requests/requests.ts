import { Ride } from "../types/types"
import { getSelectedRide } from "../utils/ride-utils"
import { railApi } from "./rail-api"
import { RouteApi } from "./route-api"

export const getRouteForRide = async (ride: Ride) => {
  const routeApi = new RouteApi(railApi)
  const routes = await routeApi.getRoutes(ride.originId, ride.destinationId, ride.departureDate, ride.locale)
  return getSelectedRide(routes, ride)
}
