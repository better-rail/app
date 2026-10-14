import * as Notifications from "expo-notifications"
import * as TaskManager from "expo-task-manager"
import { Platform } from "react-native"
import { RideApi } from "@/services/api/ride-api"
import type { RouteItem } from "@/services/api/rail-api.types"
import { getArrivalAlarm, isArrivalAlarmSupported, moveArrivalAlarm } from "./arrival-alarm-native"
import { RideStartError } from "./helpers/ride-errors"
import { getDevicePushTokenWithAuthRetry } from "./helpers/push-token-auth-retry"
import { trackEvent } from "@/services/analytics"
import { extractFcmData, isLiveRideSupported, liveRideNotifications } from "@/modules/live-ride"

const rideApi = new RideApi()
let tokenSubscription: Notifications.Subscription | undefined

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

const BACKGROUND_LIVE_RIDE_TASK = "better-rail-live-ride-notification"
const BACKGROUND_ARRIVAL_ALARM_TASK = "better-rail-arrival-alarm-notification"

const handleFcmData = (data: Record<string, string> | null) => {
  if (data?.type === "live-ride") {
    if (!isLiveRideSupported()) return
    return liveRideNotifications.processIncomingPush(data)
  }
  if (data?.type === "arrival-alarm") return handleAndroidArrivalAlarmPush(data)
}

TaskManager.defineTask(BACKGROUND_LIVE_RIDE_TASK, ({ data, error }) => {
  if (error) return
  return handleFcmData(extractFcmData(data))
})

const ARRIVAL_ALARM_UPDATES_CHANNEL = "better-rail-alarm-updates"

const handleAndroidArrivalAlarmPush = async (data: Record<string, string>) => {
  const push = { rideId: data.rideId, alarmId: data.alarmId, fireDate: Number(data.fireDate) }
  if (!push.rideId || !push.alarmId || !Number.isFinite(push.fireDate)) return

  const current = await getArrivalAlarm().catch(() => null)
  if (current?.alarmId !== push.alarmId || !current.isScheduled) return

  const moved = await moveArrivalAlarm(push).catch(() => false)
  await liveRideNotifications.postAlert({
    tag: `arrival-alarm-${push.rideId}`,
    channelId: ARRIVAL_ALARM_UPDATES_CHANNEL,
    title: data.title,
    body: moved ? data.body : data.failedBody,
    timeoutMs: Math.max(push.fireDate * 1000 - Date.now(), 60 * 1000),
  })
}

type ArrivalAlarmPush = { rideId: string; alarmId: string; fireDate: number }

const findArrivalAlarmPush = (raw: unknown, depth = 0): ArrivalAlarmPush | null => {
  if (!raw || typeof raw !== "object" || depth > 5) return null
  const alarm = (raw as Record<string, unknown>).alarm as Record<string, unknown> | undefined
  if (alarm && typeof alarm.rideId === "string" && typeof alarm.alarmId === "string" && typeof alarm.fireDate === "number") {
    return alarm as ArrivalAlarmPush
  }

  for (const value of Object.values(raw)) {
    const found = findArrivalAlarmPush(value, depth + 1)
    if (found) return found
  }
  return null
}

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
    await Notifications.setNotificationChannelAsync("better-rail", {
      name: "Better Rail",
      importance: Notifications.AndroidImportance.HIGH,
    })

    if (isLiveRideSupported()) {
      await Notifications.deleteNotificationChannelAsync("better-rail-live").catch(() => {})

      await Notifications.setNotificationChannelAsync("better-rail-live-v2", {
        name: "Better Rail Live",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: null,
        vibrationPattern: [0, 250, 200, 250],
        enableVibrate: true,
      })

      await Notifications.registerTaskAsync(BACKGROUND_LIVE_RIDE_TASK)
    }

    if (isArrivalAlarmSupported()) {
      await Notifications.setNotificationChannelAsync(ARRIVAL_ALARM_UPDATES_CHANNEL, {
        name: "Better Rail Alarm Updates",
        importance: Notifications.AndroidImportance.LOW,
        vibrationPattern: [0],
        enableVibrate: false,
      })
    }

    Notifications.addNotificationReceivedListener((notification) => {
      handleFcmData(extractFcmData(notification))?.catch(() => {})
    })
  }
}

export const getPermissionState = () => liveRideNotifications.checkPermissions()

const isDevRide = (rideId: string) => Boolean(__DEV__ && rideId.startsWith("dev-ride-"))

export const startRideNotifications = async (route: RouteItem): Promise<string> => {
  if (!isLiveRideSupported()) {
    throw new RideStartError("unsupported", "Live notifications are only supported on Android")
  }

  let token: string
  try {
    const pushToken = await getDevicePushTokenWithAuthRetry(Notifications.getDevicePushTokenAsync, (outcome) =>
      trackEvent("push_token_auth_retry", { outcome }),
    )
    token = String(pushToken.data)
  } catch (error) {
    console.error("[BetterRail] getDevicePushToken error:", error)
    throw new RideStartError("push_token", "Couldn't get a device push token", { cause: error })
  }

  let rideId: string
  try {
    rideId = await rideApi.startRide(route, token)
  } catch (error) {
    if (__DEV__) {
      console.warn("[BetterRail DEV] Backend rejected off-hours ride, using dev ride ID for e2e testing:", error)
      rideId = "dev-ride-" + Date.now()
    } else {
      console.error("[BetterRail] rideApi.startRide error:", error)
      throw error
    }
  }

  tokenSubscription?.remove()
  tokenSubscription = Notifications.addPushTokenListener((newToken) => {
    if (isDevRide(rideId)) return
    rideApi.updateRideToken(rideId, String(newToken.data))
  })

  try {
    await liveRideNotifications.start(route, rideId)
  } catch (error) {
    console.error("[BetterRail] liveRideNotifications.start error:", error)
    await Promise.allSettled([cancelNotifications(), isDevRide(rideId) ? Promise.resolve() : rideApi.endRide(rideId)])
    throw new RideStartError("notification", "Couldn't display the live ride notification", { cause: error })
  }

  return rideId
}

export const cancelNotifications = async () => {
  if (tokenSubscription) {
    tokenSubscription.remove()
    tokenSubscription = undefined
  }

  await liveRideNotifications.stop()
}

export const endRideNotifications = async (rideId: string) => {
  await cancelNotifications()
  if (isDevRide(rideId)) {
    return
  }
  return rideApi.endRide(rideId)
}

export default {
  startRideNotifications,
  endRideNotifications,
  cancelNotifications,
  getPermissionState,
}
