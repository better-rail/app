import * as Notifications from "expo-notifications"
import * as TaskManager from "expo-task-manager"
import notifee, { AndroidImportance, EventType, TriggerType } from "@notifee/react-native"
import { RideState, RideStatus, getStatusEndDate, rideProgress } from "@/hooks/use-ride-progress"
import { RideApi, RouteItem } from "@/services/api"
import { findClosestStationInRoute, getRideStatus, getTrainFromStationId } from "./helpers/ride-helpers"
import { addMinutes, addSeconds, differenceInMinutes } from "date-fns"
import { formatTime } from "./helpers/date-helpers"
import { getInitialLanguage, resolveUse12HourClock, translate, type LanguageCode } from "@/i18n"
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
import { getArrivalAlarm, isArrivalAlarmSupported, moveArrivalAlarm } from "./arrival-alarm-native"
import { RideStartError } from "./helpers/ride-errors"
import { isStationAlertPayload, openStationAlert } from "./helpers/open-station-alert"
import { isDelayGuardPayload, openDelayGuard } from "./helpers/open-delay-guard"
import { DELAY_GUARD_CHANNEL, STATION_ALERTS_CHANNEL } from "./push-channels"
import { getDevicePushTokenWithAuthRetry } from "./helpers/push-token-auth-retry"
import { trackEvent } from "@/services/analytics"

const rideApi = new RideApi()
let tokenSubscription: Notifications.Subscription | undefined

// expo-notifications is the sole FCM receiver on Android. Live-ride updates arrive as
// data-only FCM messages; Notifee owns all display, so suppress expo-notifications from
// rendering anything itself (prevents an empty/duplicate notification). Station alerts on
// iOS are plain APNs alerts the system shows in the background; in the foreground they are
// the one kind worth a banner.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data
    const alert = Platform.OS === "ios" && (isStationAlertPayload(data) || isDelayGuardPayload(data))
    return {
      shouldShowBanner: alert,
      shouldShowList: alert,
      shouldPlaySound: alert,
      shouldSetBadge: false,
    }
  },
})

export { DELAY_GUARD_CHANNEL, STATION_ALERTS_CHANNEL }

const BACKGROUND_LIVE_RIDE_TASK = "better-rail-live-ride-notification"
const BACKGROUND_ARRIVAL_ALARM_TASK = "better-rail-arrival-alarm-notification"

// Pulls the FCM `data` map out of whatever expo-notifications hands us. The wrapper shape
// differs between the background task and the foreground listener, so probe the known
// locations. VERIFY the resolved shape on a real device (see migration notes).
const extractFcmData = (raw: any): Record<string, string> | null => {
  const data =
    raw?.notification?.request?.content?.data ??
    raw?.notification?.request?.trigger?.remoteMessage?.data ??
    raw?.request?.content?.data ??
    raw?.notification?.data ??
    raw?.data ??
    raw
  return data && typeof data === "object" && typeof data.type === "string" ? data : null
}

/** A data message from the server: live-ride and arrival-alarm updates, a station alert or a Delay Notification. */
const handleFcmData = (data: Record<string, string> | null) => {
  if (data?.type === "live-ride") return handleLiveRideNotification(data)
  if (data?.type === "arrival-alarm") return handleAndroidArrivalAlarmPush(data)
  if (isStationAlertPayload(data)) return handleAlertNotification(data, STATION_ALERTS_CHANNEL)
  if (isDelayGuardPayload(data)) return handleAlertNotification(data, DELAY_GUARD_CHANNEL)
}

// Defined at module scope so it registers when index.js loads this file — including when
// the app is woken from a killed/background state to process a live-ride data message.
TaskManager.defineTask(BACKGROUND_LIVE_RIDE_TASK, async ({ data, error }) => {
  if (error) return
  return handleFcmData(extractFcmData(data))
})

const ARRIVAL_ALARM_UPDATES_CHANNEL = "better-rail-alarm-updates"

// Android: the server sends a data message when the arrival time changed. Move the alarm, then tell
// the rider quietly, like the passive notification iOS shows.
const handleAndroidArrivalAlarmPush = async (data: Record<string, string>) => {
  const push = { rideId: data.rideId, alarmId: data.alarmId, fireDate: Number(data.fireDate) }
  if (!push.rideId || !push.alarmId || !Number.isFinite(push.fireDate)) return

  // A push for an alarm the rider turned off or changed, or that already rang.
  const current = await getArrivalAlarm().catch(() => null)
  if (current?.alarmId !== push.alarmId || !current.isScheduled) return

  const moved = await moveArrivalAlarm(push).catch(() => false)
  await notifee.displayNotification({
    id: `arrival-alarm-${push.rideId}`,
    title: data.title,
    body: moved ? data.body : data.failedBody,
    android: {
      channelId: ARRIVAL_ALARM_UPDATES_CHANNEL,
      smallIcon: "notification_icon",
      pressAction: { id: "default" },
      // Pointless once the alarm rang.
      timeoutAfter: Math.max(push.fireDate * 1000 - Date.now(), 60 * 1000),
    },
  })
}

type ArrivalAlarmPush = { rideId: string; alarmId: string; fireDate: number }

// Finds the `alarm` object of an arrival-alarm push, wherever expo-notifications nested it.
const findArrivalAlarmPush = (raw: unknown, depth = 0): ArrivalAlarmPush | null => {
  if (!raw || typeof raw !== "object" || depth > 5) return null
  const alarm = (raw as Record<string, any>).alarm
  if (alarm && typeof alarm.rideId === "string" && typeof alarm.alarmId === "string" && typeof alarm.fireDate === "number") {
    return alarm
  }

  for (const value of Object.values(raw)) {
    const found = findArrivalAlarmPush(value, depth + 1)
    if (found) return found
  }
  return null
}

// iOS: the arrival-alarm push also wakes a suspended app, a fallback for when the notification
// service extension couldn't move the alarm. Moving it twice to the same time is harmless.
TaskManager.defineTask(BACKGROUND_ARRIVAL_ALARM_TASK, ({ data, error }) => {
  if (error || Platform.OS !== "ios") return
  const push = findArrivalAlarmPush(data)
  if (push) return moveArrivalAlarm(push).catch(() => {})
})

export const configureNotifications = async () => {
  if (Platform.OS === "ios" && isArrivalAlarmSupported()) {
    await Notifications.registerTaskAsync(BACKGROUND_ARRIVAL_ALARM_TASK)
  }

  if (Platform.OS === "android") {
    // Awaited: Android 13+ shows the notification permission prompt only once a channel exists,
    // and the alerts' channels have to be there before the first alert arrives.
    await Promise.all([
      notifee.createChannel({
        id: "better-rail",
        name: "Better Rail",
        description: "Get live ride notifications",
        importance: AndroidImportance.HIGH,
        sound: "default",
      }),
      notifee.createChannel({
        id: "better-rail-live",
        name: "Better Rail Live",
        description: "Get live ride persistent notification",
        vibration: false,
      }),
      notifee.createChannel({
        id: STATION_ALERTS_CHANNEL,
        name: "Station alerts",
        description: "Disruptions at the stations you follow",
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: "default",
      }),
      notifee.createChannel({
        id: DELAY_GUARD_CHANNEL,
        name: "Delay Notifications",
        description: "Your usual trains running late",
        importance: AndroidImportance.HIGH,
        vibration: true,
        sound: "default",
      }),
    ])

    // Background / killed: expo-notifications wakes the JS task defined at module scope.
    await Notifications.registerTaskAsync(BACKGROUND_LIVE_RIDE_TASK)

    if (isArrivalAlarmSupported()) {
      notifee.createChannel({
        id: ARRIVAL_ALARM_UPDATES_CHANNEL,
        name: "Better Rail Alarm Updates",
        description: "Tells you when the arrival alarm moved because of a delay",
        importance: AndroidImportance.LOW,
        vibration: false,
      })
    }

    // Foreground: data messages are delivered to this listener rather than the task.
    Notifications.addNotificationReceivedListener((notification) => {
      handleFcmData(extractFcmData(notification))?.catch(() => {})
    })

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        const data = detail.notification?.data
        if (isStationAlertPayload(data)) return openStationAlert(data.stationId)
        if (isDelayGuardPayload(data)) return openDelayGuard(data)
      }
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

/** A server alert on Android (station alert, Delay Notifications): shown with Notifee, carrying its data for the tap. */
const handleAlertNotification = async (data: Record<string, string>, channelId: string) => {
  if (!data.notifee) return
  const { notifee: words, ...payload } = data
  await notifee.displayNotification({
    ...JSON.parse(words),
    data: payload,
    android: {
      channelId,
      smallIcon: "notification_icon",
      pressAction: { id: "default" },
    },
  })
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
    const pushToken = await getDevicePushTokenWithAuthRetry(Notifications.getDevicePushTokenAsync, (outcome) =>
      trackEvent("push_token_auth_retry", { outcome }),
    )
    token = String(pushToken.data)
  } catch (error) {
    throw new RideStartError("push_token", "Couldn't get a device push token", {
      cause: error,
    })
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
    // The server already created the ride, so end it and drop everything we stored for it. Settle
    // both: one failing must not skip the other, nor replace the tagged error the reporter needs.
    await Promise.allSettled([cancelNotifications(), rideApi.endRide(rideId)])
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
  // a background wake never runs setUserLanguage, so resolve the clock style here
  const time = formatTime(targetDate, resolveUse12HourClock(i18n.locale as LanguageCode))
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
    if (stopsLeft <= 0)
      return translate("plan.rideTo", {
        destination: getRideDestination(route),
      })

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
