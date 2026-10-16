import * as Notifications from "expo-notifications"
import * as TaskManager from "expo-task-manager"
import { Platform } from "react-native"
import { RideApi } from "@/services/api/ride-api"
import type { RouteItem } from "@/services/api/rail-api.types"
import { getArrivalAlarm, isArrivalAlarmSupported, moveArrivalAlarm } from "./arrival-alarm-native"
import { RideStartError } from "./helpers/ride-errors"
import { getDevicePushTokenWithAuthRetry } from "./helpers/push-token-auth-retry"
import { trackEvent } from "@/services/analytics"
import { extractFcmData, isLiveRideSupported, liveRideNotifications, postAndroidAlert } from "@/modules/live-ride"
import { setRideId } from "./storage/background-storage"

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

const recentFcmPushes = new Map<string, number>()

export const _resetFcmDeduplication = () => {
  recentFcmPushes.clear()
}

const isDuplicateFcmData = (data: Record<string, string>): boolean => {
  const id = data.messageId ?? data["google.message_id"] ?? data.id ?? `${data.type}:${JSON.stringify(data)}`
  const now = Date.now()
  for (const [key, ts] of recentFcmPushes) {
    if (now - ts > 5000) recentFcmPushes.delete(key)
  }
  if (recentFcmPushes.has(id)) return true
  recentFcmPushes.set(id, now)
  return false
}

const handleFcmData = async (data: Record<string, string> | null): Promise<void> => {
  if (!data || isDuplicateFcmData(data)) return
  if (data.type === "live-ride") {
    if (!isLiveRideSupported()) return
    await liveRideNotifications.processIncomingPush(data)
    return
  }
  if (data.type === "arrival-alarm") {
    await handleAndroidArrivalAlarmPush(data)
  }
}

TaskManager.defineTask(BACKGROUND_LIVE_RIDE_TASK, async ({ data, error }) => {
  if (error) return
  await handleFcmData(extractFcmData(data))
})

const ARRIVAL_ALARM_UPDATES_CHANNEL = "better-rail-alarm-updates"

const handleAndroidArrivalAlarmPush = async (data: Record<string, string>) => {
  const push = { rideId: data.rideId, alarmId: data.alarmId, fireDate: Number(data.fireDate) }
  if (!push.rideId || !push.alarmId || !Number.isFinite(push.fireDate)) return

  const current = await getArrivalAlarm().catch(() => null)
  if (current?.alarmId !== push.alarmId || !current.isScheduled) return

  const moved = await moveArrivalAlarm(push).catch(() => false)
  await postAndroidAlert({
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

TaskManager.defineTask(BACKGROUND_ARRIVAL_ALARM_TASK, async ({ data, error }) => {
  if (error || Platform.OS !== "ios") return
  const push = findArrivalAlarmPush(data)
  if (push) {
    await moveArrivalAlarm(push).catch(() => {})
  }
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
    throw new RideStartError("push_token", "Couldn't get a device push token", { cause: error })
  }

  const rideId = await rideApi.startRide(route, token)

  tokenSubscription?.remove()
  tokenSubscription = Notifications.addPushTokenListener((newToken) => {
    rideApi.updateRideToken(rideId, String(newToken.data))
  })

  try {
    await setRideId(rideId)
    await liveRideNotifications.start(route, rideId)
  } catch (error) {
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

  await liveRideNotifications.stop()
}

export const endRideNotifications = async (rideId: string) => {
  await cancelNotifications()
  return rideApi.endRide(rideId)
}

export default {
  startRideNotifications,
  endRideNotifications,
  cancelNotifications,
  getPermissionState,
}
