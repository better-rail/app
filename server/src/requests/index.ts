import { railApi } from "./rail-api"
import { Ride } from "../types/rides"
import { RouteApi } from "./route-api"
import { getSelectedRide } from "../utils/ride-utils"

export const getRouteForRide = async (ride: Ride) => {
  const routeApi = new RouteApi(railApi)
  const routes = await routeApi.getRoutes(ride.originId, ride.destinationId, ride.departureDate, ride.locale)
  return getSelectedRide(routes, ride)
}
