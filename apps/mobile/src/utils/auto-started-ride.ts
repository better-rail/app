/**
 * auto-started-ride.ts — rides a recurring ride started without the rider opening the app.
 *
 * iOS: the server starts the Live Activity with push-to-start and native code registers the ride, so the app only
 * has to show it once opened. Android: the server sends a data message and the app starts the live ride itself, in
 * the background. Either way the ride's route is looked up again by its trains, since the push can't carry it.
 */
import { Platform } from "react-native"

import type { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { useRideStore } from "@/models/ride/ride"
import { formatDateForAPI, timezoneCorrection } from "@/utils/helpers/date-helpers"
import { autoStartedRide } from "@/utils/ios-helpers"
import { getRideId, getRideRoute, setRideRoute } from "@/utils/storage/background-storage"
import { trackEvent } from "@/services/analytics"

const routeApi = new RouteApi()

/** The route with these trains, from a search at its departure (ms, the app's Israel-wall-clock convention). */
export const findRideRoute = async (
  originId: number,
  destinationId: number,
  departureAt: number,
  trainNumbers: number[],
  viaStationId?: number,
): Promise<RouteItem | undefined> => {
  const [date, time] = formatDateForAPI(departureAt)
  const routes = await routeApi.getRoutes(String(originId), String(destinationId), date, time, {
    viaStation: viaStationId ? String(viaStationId) : undefined,
  })
  const trains = trainNumbers.join(",")
  return routes.find((route) => route.trains.map((train) => train.trainNumber).join(",") === trains)
}

/** Shows a ride started outside the app in the ride store, when the store doesn't have one already. */
export const adoptAutoStartedRide = async () => {
  if (useRideStore.getState().id) return

  if (Platform.OS === "ios") {
    const ride = await autoStartedRide()
    if (!ride) return
    // A naive timetable string parses into the app's convention: Israel's wall clock in the device's zone.
    const departureAt = new Date(ride.departureTime).getTime()
    const route = await findRideRoute(ride.originId, ride.destinationId, departureAt, ride.trainNumbers, ride.viaStationId)
    if (route && !useRideStore.getState().id) useRideStore.setState({ id: ride.rideId, route })
    return
  }

  const [rideId, route] = await Promise.all([getRideId(), getRideRoute()])
  if (rideId && route && !useRideStore.getState().id) useRideStore.setState({ id: rideId, route })
}

/** Android: the server's data message to start a recurring ride, received in the background or foreground. */
export const startAutoStartedRide = async (data: Record<string, string>) => {
  if (Platform.OS !== "android") return
  // One ride at a time: the rider may have started this train (or another) themselves.
  if (useRideStore.getState().id || (await getRideId())) return

  // The message carries the real instant; the app reads schedule times as Israel's wall clock in the device's zone.
  const departureAt = timezoneCorrection(new Date(Number(data.departureAt))).getTime()
  const trainNumbers = (data.trainNumbers ?? "").split(",").map(Number)
  const route = await findRideRoute(
    Number(data.originId),
    Number(data.destinationId),
    departureAt,
    trainNumbers,
    data.viaStationId ? Number(data.viaStationId) : undefined,
  )
  if (!route) return

  // Required lazily: notification-helpers imports this module.
  const { startRideNotifications } = require("@/utils/notification-helpers") as typeof import("@/utils/notification-helpers")
  const rideId = await startRideNotifications(route)
  await setRideRoute(route)
  useRideStore.setState({ id: rideId, route })
  trackEvent("recurring_ride_auto_started", { platform: "android" })
}
