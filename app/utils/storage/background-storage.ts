import Preferences from "react-native-default-preference"
import { RouteItem } from "../../services/api"

const getUserLocale = () => Preferences.get("userLocale")

const getRideNotificationId = () => Preferences.get("rideNotificationId")
const setRideNotificationId = (notificationId: string) => Preferences.set("rideNotificationId", notificationId)

const setRideRoute = (route: RouteItem) => Preferences.set("rideRoute", JSON.stringify(route))
const getRideRoute = async () => {
  const savedRoute = await Preferences.get("rideRoute")
  return savedRoute && (JSON.parse(savedRoute) as RouteItem)
}

const getRideDelay = () => Number(Preferences.get("rideDelay"))
const setRideDelay = (delay: number) => Preferences.set("rideDelay", String(delay))

const getStaleNotificationId = () => Preferences.get("staleNotificationId")
const setStaleNotificationId = (notificationId: string) => Preferences.set("staleNotificationId", notificationId)

const clearBackgroundStorage = () => Preferences.clearMultiple(["rideRoute", "rideNotificationId", "rideDelay", "lastUpdateTime"])

export {
  getUserLocale,
  getRideNotificationId,
  setRideNotificationId,
  setRideRoute,
  getRideRoute,
  getRideDelay,
  setRideDelay,
  clearBackgroundStorage,
  getStaleNotificationId,
  setStaleNotificationId,
}
