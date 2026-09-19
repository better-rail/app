/**
 * Station alerts — keeping the server in step with the stations the user asked
 * to be pushed about (settings store `stationAlerts`).
 *
 * The server does the watching (apps/server/src/station-alerts): it needs this
 * device's push token, language and list, and a PUT replaces the whole
 * subscription. So whenever the list changes, the app language changes (the
 * app restarts, so the launch sync covers it) or the push token is refreshed,
 * the full list is sent again; an emptied list is a DELETE. A sync that fails
 * (offline, server down) is retried when the app next comes to the foreground.
 */
import * as Notifications from "expo-notifications"
import { AppState, Platform } from "react-native"
import { userLocale } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import { stationAlertsApi } from "@/services/api"

export type AlertsPermission = "granted" | "denied" | "undetermined"

const toPermission = (status: Notifications.NotificationPermissionsStatus): AlertsPermission =>
  status.granted ? "granted" : status.canAskAgain ? "undetermined" : "denied"

export const getStationAlertsPermission = async (): Promise<AlertsPermission> =>
  toPermission(await Notifications.getPermissionsAsync())

export const requestStationAlertsPermission = async (): Promise<AlertsPermission> =>
  toPermission(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }))

const getPushToken = async (): Promise<string> => String((await Notifications.getDevicePushTokenAsync()).data)

let inFlight: Promise<boolean> | undefined
let pending = false

/**
 * Tell the server the current list. Resolves true when the server is in step, false when it is
 * not (no permission, offline, server down), in which case a later sync is owed.
 */
export const syncStationAlerts = (): Promise<boolean> => {
  if (inFlight) {
    pending = true
    return inFlight
  }
  inFlight = (async () => {
    try {
      return await syncOnce()
    } catch {
      return false
    } finally {
      inFlight = undefined
      if (pending) {
        pending = false
        void syncStationAlerts()
      }
    }
  })()
  return inFlight
}

let needsRetry = false

const syncOnce = async (): Promise<boolean> => {
  const { stationAlerts, stationAlertsRegistered, setStationAlertsRegistered } = useSettingsStore.getState()

  if (stationAlerts.length === 0) {
    if (!stationAlertsRegistered) return true
    try {
      await stationAlertsApi.unsubscribe(await getPushToken())
      setStationAlertsRegistered(false)
      needsRetry = false
      return true
    } catch {
      needsRetry = true
      return false
    }
  }

  if ((await getStationAlertsPermission()) !== "granted") {
    needsRetry = true
    return false
  }
  try {
    await stationAlertsApi.subscribe({
      token: await getPushToken(),
      provider: Platform.OS === "ios" ? "ios" : "android",
      locale: userLocale,
      stations: stationAlerts.map((a) => ({ stationId: a.stationId, lineIds: a.lineIds, dayTypes: a.dayTypes })),
    })
    setStationAlertsRegistered(true)
    needsRetry = false
    return true
  } catch {
    needsRetry = true
    return false
  }
}

let debounce: ReturnType<typeof setTimeout> | undefined
let watching = false

/**
 * Start keeping the server in step: once at launch (a new token, or a language change, since the
 * last run), on every change of the list, when the push token is refreshed, and again on the next
 * foreground after a sync that did not go through.
 */
export const watchStationAlerts = () => {
  if (watching) return
  watching = true

  const { stationAlerts, stationAlertsRegistered } = useSettingsStore.getState()
  if (stationAlerts.length > 0 || stationAlertsRegistered) void syncStationAlerts()

  let last = stationAlerts
  useSettingsStore.subscribe((state) => {
    if (state.stationAlerts === last) return
    last = state.stationAlerts
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => void syncStationAlerts(), 1_000)
  })

  Notifications.addPushTokenListener(() => {
    const { stationAlerts: alerts, stationAlertsRegistered: registered } = useSettingsStore.getState()
    if (alerts.length > 0 || registered) void syncStationAlerts()
  })

  let previous = AppState.currentState
  AppState.addEventListener("change", (next) => {
    if (previous.match(/inactive|background/) && next === "active" && needsRetry) void syncStationAlerts()
    previous = next
  })
}
