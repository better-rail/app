import { railApi } from "./rail-api"
import { Ride } from "../types/rides"
import { RouteApi } from "./route-api"
import { logNames, logger } from "../logs"
import { getSelectedRide } from "../utils/ride-utils"

export const getRouteForRide = async (ride: Ride) => {
  try {
    const routeApi = new RouteApi(railApi)
    const routes = await routeApi.getRoutes(ride.originId, ride.destinationId, ride.departureDate, ride.locale)
    const selected = getSelectedRide(routes, ride)
    if (!selected) {
      throw new Error("Didn't find the requested route in response")
    }

    logger.success(logNames.routeApi.getRoutes.success, {
      date: ride.departureDate,
      trains: ride.trains,
    })
    return selected
  } catch (error) {
    logger.failed(logNames.routeApi.getRoutes.failed, {
      error,
      date: ride.departureDate,
      origin: ride.originId,
      destination: ride.destinationId,
      trains: ride.trains,
    })

    return null
  }
}
