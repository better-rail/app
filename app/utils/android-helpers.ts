import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging"
import * as Burnt from "burnt"
import notifee, { AndroidImportance, Notification } from "@notifee/react-native"
import { RideState, RideStatus, getStatusEndDate, rideProgress } from "../hooks/use-ride-progress"
import { RideApi, RouteItem } from "../services/api"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "./helpers/ride-helpers"
import { differenceInMinutes, format } from "date-fns"
import { last } from "lodash"

const rideApi = new RideApi()
let rideRoute: RouteItem
let rideNotification: Notification
let unsubscribeTokenUpdates: () => void

export const configureAndroidNotifications = () => {
  notifee.createChannel({
    id: "better-rail",
    name: "Better Rail",
    description: "Get live ride notifications",
    importance: AndroidImportance.HIGH,
    sound: "default",
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

    if (rideNotification && state) {
      updateNotification(rideRoute, state)
    }
  }

  messaging().onMessage(onRecievedMessage)
  messaging().setBackgroundMessageHandler(onRecievedMessage)
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

  notifee.registerForegroundService(async (notification) => {
    rideRoute = route
    rideNotification = notification

    const nextStationId = findClosestStationInRoute(route)
    const train = getTrainFromStationId(route, nextStationId)
    const status = getRideStatus(route, train, nextStationId)

    const state: RideState = {
      status,
      nextStationId,
      delay: train.delay,
    }

    await updateNotification(route, state)
  })

  return rideId
}

export const endRideNotifications = async (rideId: string) => {
  if (unsubscribeTokenUpdates) unsubscribeTokenUpdates()
  if (rideNotification) {
    rideRoute = null
    rideNotification = null
    await notifee.stopForegroundService()
  }

  return rideApi.endRide(rideId)
}

const updateNotification = (route: RouteItem, state: RideState) => {
  return notifee.displayNotification({
    id: rideNotification.id,
    title: getTitleText(route, state),
    subtitle: getSubtitleText(route, state),
    android: {
      channelId: "better-rail",
      actions: [
        {
          title: "Stop",
          pressAction: {
            id: "stop",
          },
        },
      ],
    },
  })
}

const getTitleText = (route: RouteItem, state: RideState) => {
  const targetDate = getStatusEndDate(route, state)
  const minutes = differenceInMinutes(targetDate, Date.now(), { roundingMethod: "ceil" })
  const time = format(targetDate, "HH:mm")
  const timeText = " in " + minutes + "min (" + time + ")"

  if (state.status === "waitForTrain" || state.status === "inExchange") {
    return "Train departs" + timeText
  } else if (state.status === "inTransit") {
    return "Arriving" + timeText
  } else {
    return "Arrived at " + last(route.trains).destinationStationName
  }
}

const getSubtitleText = (route: RouteItem, state: RideState) => {
  if (state.status === "waitForTrain" || state.status === "inExchange") {
    const train = getTrainFromStationId(route, state.nextStationId)
    return "Train " + train.trainNumber + " to " + train.lastStop + ", departs from platform " + train.originPlatform
  } else if (state.status === "inTransit") {
    const progress = rideProgress(route, state.nextStationId)
    const stopsLeft = progress[1] - progress[0]
    if (stopsLeft === 1) return "Get off at the next stop"
    else return "Get off in " + stopsLeft + " stops"
  } else {
    return "Thanks for riding with Better Rail"
  }
}

export default {
  startRideNotifications,
  endRideNotifications,
}
