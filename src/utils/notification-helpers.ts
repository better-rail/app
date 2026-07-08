import * as Notifications from "expo-notifications"
import * as TaskManager from "expo-task-manager"
import notifee, { AndroidImportance, EventType, TriggerType } from "@notifee/react-native"
import { RideState, RideStatus, getStatusEndDate, rideProgress } from "@/hooks/use-ride-progress"
import { RideApi, RouteItem } from "@/services/api"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "./helpers/ride-helpers"
import { addMinutes, addSeconds, differenceInMinutes, format } from "date-fns"
import { getInitialLanguage, translate } from "@/i18n"
import i18n from "i18n-js"
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

const rideApi = new RideApi()
let tokenSubscription: Notifications.Subscription | undefined

// expo-notifications is the sole FCM receiver on Android. Live-ride updates arrive as
// data-only FCM messages; Notifee owns all display, so suppress expo-notifications from
// rendering anything itself (prevents an empty/duplicate notification).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const BACKGROUND_LIVE_RIDE_TASK = "better-rail-live-ride-notification"

// Pulls the FCM `data` map out of whatever expo-notifications hands us. The wrapper shape
// differs between the background task and the foreground listener, so probe the known
// locations. VERIFY the resolved shape on a real device (see migration notes).
const extractLiveRidePayload = (raw: any): Record<string, string> | null => {
  const data =
    raw?.notification?.request?.content?.data ??
    raw?.notification?.request?.trigger?.remoteMessage?.data ??
    raw?.request?.content?.data ??
    raw?.notification?.data ??
    raw?.data ??
    raw
  return data?.type === "live-ride" ? data : null
}

// Defined at module scope so it registers when index.js loads this file — including when
// the app is woken from a killed/background state to process a live-ride data message.
TaskManager.defineTask(BACKGROUND_LIVE_RIDE_TASK, ({ data, error }) => {
  if (error) return
  const payload = extractLiveRidePayload(data)
  if (payload) return handleLiveRideNotification(payload)
})

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
      id: "better-rail-live",
      name: "Better Rail Live",
      description: "Get live ride persistent notification",
      vibration: false,
    })

    // Background / killed: expo-notifications wakes the JS task defined at module scope.
    await Notifications.registerTaskAsync(BACKGROUND_LIVE_RIDE_TASK)

    // Foreground: data messages are delivered to this listener rather than the task.
    Notifications.addNotificationReceivedListener((notification) => {
      const payload = extractLiveRidePayload(notification)
      if (payload) handleLiveRideNotification(payload).catch(() => {})
    })

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

const handleLiveRideNotification = async (data: Record<string, string>) => {
  if (!data) return

  if (data.notifee) {
    notifee.displayNotification({
      ...JSON.parse(data.notifee),
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
    status: data.status as RideStatus,
    delay: Number(data.delay),
    nextStationId: Number(data.nextStationId),
  }

  await setRideDelay(state.delay)
  scheduleStaleNotification()

  const rideNotificationId = await getRideNotificationId()
  if (rideNotificationId && state) {
    const rideRoute = await getRideRoute()
    updateNotification(rideRoute, state)
  }
}

export const startRideNotifications = async (route: RouteItem) => {
  const token = String((await Notifications.getDevicePushTokenAsync()).data)
  const rideId = await rideApi.startRide(route, token)

  if (!rideId) {
    throw new Error("Couldn't start ride")
  }

  tokenSubscription?.remove()
  tokenSubscription = Notifications.addPushTokenListener((newToken) => {
    rideApi.updateRideToken(rideId, String(newToken.data))
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
  if (tokenSubscription) {
    tokenSubscription.remove()
    tokenSubscription = undefined
  }

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
