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
import { RideStartError } from "./helpers/ride-errors"

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
        if (!rideRoute) return
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

/// Maps the server's ride status onto the one we compute locally. The server sends `getOff` a
/// minute before arrival, which has no local equivalent - it's still the same in-transit phase,
/// and leaving it unmapped falls through to the "you have arrived" title while the train moves.
const toRideStatus = (status: string): RideStatus => (status === "getOff" ? "inTransit" : (status as RideStatus))

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
    status: toRideStatus(data.status),
    delay: Number(data.delay),
    nextStationId: Number(data.nextStationId),
  }

  await setRideDelay(state.delay)
  scheduleStaleNotification()

  const rideNotificationId = await getRideNotificationId()
  if (rideNotificationId && state) {
    const rideRoute = await getRideRoute()
    if (!rideRoute) return
    updateNotification(rideRoute, state)
  }
}

export const startRideNotifications = async (route: RouteItem) => {
  // Getting a push token can fail on its own (no Play Services, FCM unreachable), so mark it as its own stage.
  let token: string
  try {
    token = String((await Notifications.getDevicePushTokenAsync()).data)
  } catch (error) {
    throw new RideStartError("push_token", "Couldn't get a device push token", { cause: error })
  }

  const rideId = await rideApi.startRide(route, token)

  tokenSubscription?.remove()
  tokenSubscription = Notifications.addPushTokenListener((newToken) => {
    rideApi.updateRideToken(rideId, String(newToken.data))
  })

  try {
    await setRideRoute(route)
    const nextStationId = findClosestStationInRoute(route)
    const train = getTrainFromStationId(route, nextStationId)
    const status = getRideStatus(route, train, nextStationId)

    const state: RideState = {
      status,
      nextStationId,
      delay: train?.delay ?? 0,
    }

    await setRideDelay(state.delay)
    const rideNotificationId = await updateNotification(route, state)
    await setRideNotificationId(rideNotificationId)
    scheduleStaleNotification()
  } catch (error) {
    // The server already created the ride, so end it and drop everything we stored for it.
    await cancelNotifications()
    await rideApi.endRide(rideId)
    throw new RideStartError("notification", "Couldn't display the live ride notification", { cause: error })
  }

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
  }

  // Always clear: a start that failed before the notification id was stored still wrote the route,
  // which a leftover stale-notification trigger would otherwise resurrect.
  await clearBackgroundStorage()
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

/// The route destination, used as a fallback when we can't resolve the ride's current position
const getRideDestination = (route: RouteItem) => route.trains[route.trains.length - 1].destinationStationName

const getTitleText = (route: RouteItem, state: RideState) => {
  const targetDate = getStatusEndDate(route, state)

  // the next station couldn't be matched to a train, so there's no time to show.
  // fall back to the ride destination instead of rendering an invalid date.
  if (!targetDate || state.status === "loading") {
    return translate("plan.rideTo", { destination: getRideDestination(route) })
  }

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
    const destination = getRideDestination(route)
    return translate("plan.rideTo", { destination }) + " | " + translate("ride.connectionIssues")
  } else if (state.status === "loading") {
    return translate("ride.activatingRide")
  } else if (state.status === "waitForTrain" || state.status === "inExchange") {
    const train = getTrainFromStationId(route, state.nextStationId)

    // the status comes from the server while the lookup runs against the locally cached route,
    // so the two can disagree - fall back rather than reading a missing train's details.
    if (!train) return translate("ride.activatingRide")

    return translate("ride.trainInfo", {
      trainNumber: train.trainNumber,
      lastStop: train.lastStop,
      platform: train.originPlatform,
    })
  } else if (state.status === "inTransit") {
    const [currentIndex, totalStations] = rideProgress(route, state.nextStationId)
    const stopsLeft = totalStations - currentIndex

    // rideProgress reports [0, 0] when the station isn't in the route, which would render
    // "get off in 0 stops" - fall back rather than showing a nonsense count
    if (stopsLeft <= 0) return translate("plan.rideTo", { destination: getRideDestination(route) })

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
