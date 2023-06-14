import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging"
import * as Burnt from "burnt"
import notifee, { AndroidImportance, AndroidLaunchActivityFlag } from "@notifee/react-native"
import { RideState, RideStatus, getStatusEndDate, rideProgress } from "../hooks/use-ride-progress"
import { RideApi, RouteItem } from "../services/api"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "./helpers/ride-helpers"
import { addMinutes, differenceInMinutes, format } from "date-fns"
import Preferences from "react-native-default-preference"
import { getInitialLanguage, translate } from "../i18n"
import i18n from "i18n-js"

const rideApi = new RideApi()
let unsubscribeTokenUpdates: () => void

const getRideNotificationId = () => Preferences.get("rideNotificationId")
const setRideRoute = (route: RouteItem) => Preferences.set("rideRoute", JSON.stringify(route))
const setRideNotificationId = (notificationId: string) => Preferences.set("rideNotificationId", notificationId)
const getRideRoute = async () => {
  const savedRoute = await Preferences.get("rideRoute")
  return savedRoute && (JSON.parse(savedRoute) as RouteItem)
}

export const configureAndroidNotifications = async () => {
  notifee.createChannel({
    id: "better-rail",
    name: "Better Rail",
    description: "Get live ride notifications",
    importance: AndroidImportance.HIGH,
    sound: "default",
  })

  notifee.createChannel({
    id: "better-rail-live",
    name: "Better Rail Live",
    description: "Get live ride persistent notification",
    vibration: false,
  })

  const onRecievedMessage = async (message: FirebaseMessagingTypes.RemoteMessage) => {
    if (message.notification) {
      Burnt.toast({
        title: message.notification.title,
        message: message.notification.body,
      })
    }

    const state: RideState = message.data && {
      status: message.data.status as RideStatus,
      delay: Number(message.data.delay),
      nextStationId: Number(message.data.nextStationId),
    }

    const rideNotificationId = await getRideNotificationId()
    if (rideNotificationId && state) {
      const rideRoute = await getRideRoute()
      updateNotification(rideRoute, state)
    }
  }

  messaging().onMessage(onRecievedMessage)
  messaging().setBackgroundMessageHandler(onRecievedMessage)
  notifee.onBackgroundEvent(() => {
    return new Promise((resolve) => {
      resolve()
    })
  })
}

export const startRideNotifications = async (route: RouteItem) => {
  const token = await messaging().getToken()
  const rideId = await rideApi.startRide(route, token)

  if (!rideId) {
    throw new Error("Couldn't start ride")
  }

  unsubscribeTokenUpdates = messaging().onTokenRefresh((newToken) => {
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

  const rideNotificationId = await updateNotification(route, state)
  await setRideNotificationId(rideNotificationId)
  return rideId
}

export const cancelNotifications = async () => {
  messaging().deleteToken()
  if (unsubscribeTokenUpdates) unsubscribeTokenUpdates()

  const rideNotificationId = await getRideNotificationId()
  if (rideNotificationId) {
    notifee.cancelNotification(rideNotificationId)
    Preferences.clearMultiple(["rideRoute", "rideNotificationId"])
  }
}

export const endRideNotifications = async (rideId: string) => {
  await cancelNotifications()
  return rideApi.endRide(rideId)
}

const updateNotification = async (route: RouteItem, state: RideState) => {
  const rideNotificationId = await getRideNotificationId()
  const userLanguage = (await Preferences.get("userLocale")) || getInitialLanguage()
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
      timeoutAfter: state.status === "arrived" ? addMinutes(new Date(), 3).getTime() : undefined,
      pressAction: {
        id: "default",
        launchActivity: "com.betterrail.MainActivity",
        launchActivityFlags: [AndroidLaunchActivityFlag.SINGLE_TOP],
      },
    },
  })
}

const getTitleText = (route: RouteItem, state: RideState) => {
  const targetDate = getStatusEndDate(route, state)
  const minutes = differenceInMinutes(targetDate, Date.now(), { roundingMethod: "ceil" })
  const time = format(targetDate, "HH:mm")
  const timeText = "(" + time + ")"

  if (state.status === "waitForTrain" || state.status === "inExchange") {
    if (minutes < 2) return translate("ride.departsNow") + " " + timeText
    else return translate("ride.departsIn", { minutes }) + " " + timeText
  } else if (state.status === "inTransit") {
    return translate("ride.arrivingIn", { minutes }) + " " + timeText
  } else {
    return translate("ride.arrived")
  }
}

const getBodyText = (route: RouteItem, state: RideState) => {
  if (state.status === "waitForTrain" || state.status === "inExchange") {
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
