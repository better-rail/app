import { randomUUID } from "node:crypto"

import { Ride } from "../types/ride"
import { RouteApi } from "./route-api"
import { logNames, logger } from "../logs"
import { getSelectedRide } from "../utils/ride-utils"
import { NoActiveFeedError } from "./gtfs-route-api"

export const getRouteForRide = async (ride: Ride, requestId: string = randomUUID()) => {
  try {
    const routeApi = new RouteApi()
    const routes = await routeApi.getRoutes(ride.originId, ride.destinationId, ride.departureDate, ride.locale, {
      viaStation: ride.viaStationId,
    })
    const selected = getSelectedRide(routes, ride)
    if (!selected) {
      throw new Error("Didn't find the requested route in response")
    }

    logger.info(logNames.routeApi.getRoutes.success, { requestId })
    return selected
  } catch (error) {
    logger.error(logNames.routeApi.getRoutes.failed, {
      requestId,
      reason: error instanceof NoActiveFeedError ? "timetable_unavailable" : "route_lookup_failed",
      errorType: error instanceof Error ? error.name : "unknown",
    })
    if (error instanceof NoActiveFeedError) throw error

    return null
  }
}
