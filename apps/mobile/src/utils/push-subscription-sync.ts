/**
 * Keeping a server-side push subscription in step with a list the user keeps in
 * the settings store: the station alerts and the Delay Guard trains both work
 * this way (see station-alerts.ts and delay-guards.ts).
 *
 * The server needs this device's push token, language and the full list, and a
 * PUT replaces the subscription. So whenever the list changes, the app launches
 * (a new token, or a language change, since the last run) or the push token is
 * refreshed, the full list is sent again; an emptied list is a DELETE. A sync
 * that fails (offline, server down) is retried when the app next comes to the
 * foreground.
 */
import * as Notifications from "expo-notifications"
import { AppState, Platform } from "react-native"
import { userLocale } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import type { PushDevice } from "@/services/api"

export type AlertsPermission = "granted" | "denied" | "undetermined"

const toPermission = (status: Notifications.NotificationPermissionsStatus): AlertsPermission =>
  status.granted ? "granted" : status.canAskAgain ? "undetermined" : "denied"

export const getPushPermission = async (): Promise<AlertsPermission> => toPermission(await Notifications.getPermissionsAsync())

export const requestPushPermission = async (): Promise<AlertsPermission> =>
  toPermission(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }))

export const getPushToken = async (): Promise<string> => String((await Notifications.getDevicePushTokenAsync()).data)

/** This device, as every subscription names it. */
const pushDevice = async (): Promise<PushDevice> => ({
  token: await getPushToken(),
  provider: Platform.OS === "ios" ? "ios" : "android",
  locale: userLocale,
})

type SyncSpec<T> = {
  /** The list, from the store's state. */
  items: (state: ReturnType<typeof useSettingsStore.getState>) => T[]
  /** Whether the server holds this device's subscription, and setting that. */
  registered: (state: ReturnType<typeof useSettingsStore.getState>) => boolean
  setRegistered: (registered: boolean) => void
  subscribe: (device: PushDevice, items: T[]) => Promise<void>
  unsubscribe: (token: string) => Promise<void>
}

/** Returns `watch`: start keeping the server in step for the life of the app. */
export const createSubscriptionSync = <T>(spec: SyncSpec<T>): (() => void) => {
  let inFlight: Promise<boolean> | undefined
  let pending = false
  let needsRetry = false

  const syncOnce = async (): Promise<boolean> => {
    const state = useSettingsStore.getState()
    const items = spec.items(state)
    try {
      if (items.length === 0) {
        if (!spec.registered(state)) return true
        await spec.unsubscribe(await getPushToken())
        spec.setRegistered(false)
      } else {
        if ((await getPushPermission()) !== "granted") throw new Error("Notifications not allowed")
        await spec.subscribe(await pushDevice(), items)
        spec.setRegistered(true)
      }
      needsRetry = false
      return true
    } catch {
      needsRetry = true
      return false
    }
  }

  const sync = (): Promise<boolean> => {
    if (inFlight) {
      pending = true
      return inFlight
    }
    inFlight = syncOnce().finally(() => {
      inFlight = undefined
      if (pending) {
        pending = false
        void sync()
      }
    })
    return inFlight
  }

  let watching = false
  let debounce: ReturnType<typeof setTimeout> | undefined

  const watch = () => {
    if (watching) return
    watching = true

    const wanted = () => {
      const state = useSettingsStore.getState()
      return spec.items(state).length > 0 || spec.registered(state)
    }
    if (wanted()) void sync()

    let last = spec.items(useSettingsStore.getState())
    useSettingsStore.subscribe((state) => {
      const items = spec.items(state)
      if (items === last) return
      last = items
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => void sync(), 1_000)
    })

    Notifications.addPushTokenListener(() => {
      if (wanted()) void sync()
    })

    let previous = AppState.currentState
    AppState.addEventListener("change", (next) => {
      if (previous.match(/inactive|background/) && next === "active" && needsRetry) void sync()
      previous = next
    })
  }

  return watch
}
