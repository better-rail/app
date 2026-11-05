import Preferences from "react-native-default-preference"
import { RouteItem } from "@/services/api"

const getUserLocale = () => Preferences.get("userLocale")

const setRideRoute = (route: RouteItem) => Preferences.set("rideRoute", JSON.stringify(route))
const getRideRoute = async () => {
  const savedRoute = await Preferences.get("rideRoute")
  return savedRoute && (JSON.parse(savedRoute) as RouteItem)
}

const setRideId = (rideId: string) => Preferences.set("rideId", rideId)
const getRideId = () => Preferences.get("rideId")

const clearBackgroundStorage = () => Preferences.clearMultiple(["rideRoute", "rideId"])

const setApiBaseUrl = (url: string) => Preferences.set("apiBaseUrl", url)

const NATIVE_STOPPED_RIDE_KEY = "nativelyStoppedRideId"

const consumeNativeStopHandled = async (rideId: string): Promise<boolean> => {
  const stoppedRideId = await Preferences.get(NATIVE_STOPPED_RIDE_KEY)
  if (stoppedRideId !== rideId) return false
  await Preferences.clearMultiple([NATIVE_STOPPED_RIDE_KEY])
  return true
}

export {
  getUserLocale,
  setRideRoute,
  getRideRoute,
  setRideId,
  getRideId,
  clearBackgroundStorage,
  setApiBaseUrl,
  consumeNativeStopHandled,
}
