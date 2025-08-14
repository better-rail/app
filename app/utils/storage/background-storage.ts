import * as SecureStore from "expo-secure-store"
import { RouteItem } from "../../services/api"

const getUserLocale = async () => await SecureStore.getItemAsync("userLocale")

const getRideNotificationId = async () => await SecureStore.getItemAsync("rideNotificationId")
const setRideNotificationId = async (notificationId: string) =>
  await SecureStore.setItemAsync("rideNotificationId", notificationId)

const setRideRoute = async (route: RouteItem) => await SecureStore.setItemAsync("rideRoute", JSON.stringify(route))
const getRideRoute = async () => {
  const savedRoute = await SecureStore.getItemAsync("rideRoute")
  return savedRoute && (JSON.parse(savedRoute) as RouteItem)
}

const getRideDelay = async () => {
  const delay = await SecureStore.getItemAsync("rideDelay")
  return delay ? Number(delay) : 0
}
const setRideDelay = async (delay: number) => await SecureStore.setItemAsync("rideDelay", String(delay))

const getStaleNotificationId = async () => await SecureStore.getItemAsync("staleNotificationId")
const setStaleNotificationId = async (notificationId: string) =>
  await SecureStore.setItemAsync("staleNotificationId", notificationId)

const clearBackgroundStorage = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync("rideRoute"),
    SecureStore.deleteItemAsync("rideNotificationId"),
    SecureStore.deleteItemAsync("rideDelay"),
    SecureStore.deleteItemAsync("staleNotificationId"),
  ])
}

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
