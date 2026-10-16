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

export { getUserLocale, setRideRoute, getRideRoute, setRideId, getRideId, clearBackgroundStorage }
