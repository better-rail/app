import { messaging } from "../services/firebase/messaging"
import notifee, { AndroidImportance, EventType, TriggerType } from "@notifee/react-native"
import { RideState, RideStatus, getStatusEndDate, rideProgress } from "../hooks/use-ride-progress"
import { RideApi, RouteItem } from "../services/api"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "./helpers/ride-helpers"
import { addMinutes, addSeconds, differenceInMinutes, format } from "date-fns"
import { getInitialLanguage, translate } from "../i18n"
import i18n from "i18n-js"
import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  getRideRoute,
  setRideRoute,
  setRideDelay,
  getUserLocale,
  getRideDelay,
  setStaleNotificationId,
  getStaleNotificationId,
  getRideNotificationId,
  setRideNotificationId,
  clearBackgroundStorage,
} from "./storage/background-storage"
import { Platform } from "react-native"
import { FirebaseMessagingTypes } from "@react-native-firebase/messaging"

const rideApi = new RideApi()
let unsubscribeTokenUpdates: () => void

export const configureNotifications = async () => {
  if (Platform.OS === "android") {
    notifee.createChannel({
      id: "better-rail",
      name: "Better Rail",
      description: "Get live ride notifications",
      importance: AndroidImportance.HIGH,
      sound: "default",
    })

    notifee.createChannel({
      id: "better-rail-service-updates",
      name: "Service Updates",
      description: "Israel Railways service updates",
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: "default",
    })

    notifee.createChannel({
      id: "better-rail-live",
      name: "Better Rail Live",
      description: "Get live ride persistent notification",
      vibration: false,
    })
  }

  const onRecievedMessage = async (message: FirebaseMessagingTypes.RemoteMessage) => {
    if (message.data?.type === "live-ride" && Platform.OS === "android") {
      return handleLiveRideNotification(message)
    }

    if (message.data?.type === "service-update") {
      return handleServiceUpdateNotification(message)
    }
  }

  messaging.onMessage(onRecievedMessage)
  messaging.setBackgroundMessageHandler(onRecievedMessage)

  if (Platform.OS === "android") {
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.data?.type === "live-ride-stale") {
        const rideRoute = await getRideRoute()
        const rideDelay = await getRideDelay()
        if (addMinutes(rideRoute.arrivalTime, rideDelay).getTime() > Date.now()) {
          const state: RideState = {
            status: "stale",
            delay: rideDelay,
            nextStationId: rideRoute.trains[rideRoute.trains.length - 1].destinationStationId,
          }

          updateNotification(rideRoute, state)
        }
      }
    })
  }
}

const handleLiveRideNotification = async (message: FirebaseMessagingTypes.RemoteMessage) => {
  if (!message.data) return;

  if (message.data.notifee) {
    notifee.displayNotification({
      ...JSON.parse(message.data.notifee),
      android: {
        channelId: "better-rail",
        smallIcon: "notification_icon",
        timeoutAfter: 60 * 1000,
        pressAction: {
          id: "default",
        },
      },
    })
  }

  const state: RideState = {
    status: message.data.status as RideStatus,
    delay: Number(message.data.delay),
    nextStationId: Number(message.data.nextStationId),
  }

  await setRideDelay(state.delay)
  scheduleStaleNotification()

  const rideNotificationId = await getRideNotificationId()
  if (rideNotificationId && state) {
    const rideRoute = await getRideRoute()
    updateNotification(rideRoute, state)
  }
}

const handleServiceUpdateNotification = async (message: FirebaseMessagingTypes.RemoteMessage) => {
  if (!message.data) return;

  const { title, body, stations } = message.data
  const parsedStations = JSON.parse(stations)

  let displayNotification = false
  /**
   * If the message is for all stations, display it
   * Otherwise, check if the message is for any of the stations that the user has enabled notifications for
   */
  if (parsedStations.includes("all-stations")) {
    displayNotification = true
  } else {
    const rootStoreString = await AsyncStorage.getItem("root")
    const rootStore = JSON.parse(rootStoreString)

    const stationsNotifications: string[] = rootStore.settings.stationsNotifications
    const favoriteRoutes: string[] = rootStore.favoriteRoutes.routes.flatMap((route) => [route.originId, route.destinationId])
    const stationsToCheck = [...stationsNotifications, ...favoriteRoutes]

    parsedStations.find((station) => {
      if (stationsToCheck.includes(station)) {
        displayNotification = true
        return true
      }

      return false
    })
  }

  if (displayNotification) {
    notifee.displayNotification({
      title,
      body,
      ios: { sound: "default" },
      android: {
        channelId: "better-rail-service-updates",
        smallIcon: "notification_icon",
        pressAction: {
          id: "default",
        },
      },
    })
  }
}

export const startRideNotifications = async (route: RouteItem) => {
  const token = await messaging.getToken()
  const rideId = await rideApi.startRide(route, token)

  if (!rideId) {
    throw new Error("Couldn't start ride")
  }

  unsubscribeTokenUpdates = messaging.onTokenRefresh((newToken) => {
    rideApi.updateRideToken(rideId, newToken)
  })

  await setRideRoute(route)
  const nextStationId = findClosestStationInRoute(route)
  const train = getTrainFromStationId(route, nextStationId)
  const status = getRideStatus(route, train, nextStationId)

  const state: RideState = {
    status,
    nextStationId,
    delay: train.delay,
  }

  await setRideDelay(state.delay)
  const rideNotificationId = await updateNotification(route, state)
  await setRideNotificationId(rideNotificationId)
  scheduleStaleNotification()

  return rideId
}

export const cancelNotifications = async () => {
  messaging.deleteToken()
  if (unsubscribeTokenUpdates) unsubscribeTokenUpdates()

  const rideNotificationId = await getRideNotificationId()
  if (rideNotificationId) {
    notifee.cancelNotification(rideNotificationId)
    clearBackgroundStorage()
  }
}

export const endRideNotifications = async (rideId: string) => {
  await cancelNotifications()
  return rideApi.endRide(rideId)
}

const scheduleStaleNotification = async () => {
  try {
    const staleNotificationId = await getStaleNotificationId()
    if (staleNotificationId) {
      notifee.cancelTriggerNotification(staleNotificationId)
    }

    const notificationId = await notifee.createTriggerNotification(
      {
        android: {
          channelId: "better-rail-live",
          timeoutAfter: 1,
        },
        data: {
          type: "live-ride-stale",
        },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: addSeconds(Date.now(), 135).getTime(),
      },
    )

    await setStaleNotificationId(notificationId)
  } catch {}
}

const updateNotification = async (route: RouteItem, state: RideState) => {
  const rideNotificationId = await getRideNotificationId()
  const userLanguage = (await getUserLocale()) || getInitialLanguage()
  i18n.locale = userLanguage

  return notifee.displayNotification({
    [rideNotificationId && "id"]: rideNotificationId,
    title: getTitleText(route, state),
    body: getBodyText(route, state),
    android: {
      channelId: "better-rail-live",
      smallIcon: "notification_icon",
      ongoing: state.status !== "arrived",
      autoCancel: state.status === "arrived",
      timeoutAfter: state.status === "arrived" ? 3 * 60 * 1000 : undefined,
      pressAction: {
        id: "default",
      },
    },
  })
}

const getTitleText = (route: RouteItem, state: RideState) => {
  const targetDate = getStatusEndDate(route, state)
  const minutes = differenceInMinutes(targetDate, Date.now(), { roundingMethod: "ceil" })
  const time = format(targetDate, "HH:mm")
  const timeText = "(" + time + ")"

  if (state.status === "stale") {
    const delayText = state.delay > 0 ? ` (${state.delay} ${translate("routes.delayTime")})` : ""
    return translate("ride.arrivingAt", { time }) + delayText
  } else if (state.status === "waitForTrain" || state.status === "inExchange") {
    if (minutes < 2) return translate("ride.departsNow") + " " + timeText
    else return translate("ride.departsIn", { minutes }) + " " + timeText
  } else if (state.status === "inTransit") {
    return translate("ride.arrivingIn", { minutes }) + " " + timeText
  } else {
    return translate("ride.arrived")
  }
}

const getBodyText = (route: RouteItem, state: RideState) => {
  if (state.status === "stale") {
    const destination = route.trains[route.trains.length - 1].destinationStationName
    return translate("plan.rideTo", { destination }) + " | " + translate("ride.connectionIssues")
  } else if (state.status === "waitForTrain" || state.status === "inExchange") {
    const train = getTrainFromStationId(route, state.nextStationId)
    return translate("ride.trainInfo", {
      trainNumber: train.trainNumber,
      lastStop: train.lastStop,
      platform: train.originPlatform,
    })
  } else if (state.status === "inTransit") {
    const progress = rideProgress(route, state.nextStationId)
    const stopsLeft = progress[1] - progress[0]
    if (stopsLeft === 1) return translate("ride.getOffNextStop")
    else return translate("ride.getOffInStops", { stopsLeft })
  } else {
    return translate("ride.greeting")
  }
}

export default {
  startRideNotifications,
  endRideNotifications,
  cancelNotifications,
}
