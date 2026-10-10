/**
 * Keeping a server-side push subscription in step with a list the user keeps in
 * the settings store: the station alerts and the Delay Notifications trains both work
 * this way (see station-alerts.ts and delay-guards.ts).
 *
 * The server needs this device's push token, language and the full list, and a
 * PUT replaces the subscription. So whenever the list changes, the app launches
 * (a new token, or a language change, since the last run), the push token is
 * refreshed or the notification permission changes, the full list is sent again.
 * An emptied list is a DELETE, and so is a permission taken away (or the feature's
 * Android channel muted): the server stops pushing to a device that cannot show
 * them, and is told again once they can be shown. The token the server holds the
 * subscription under is kept, so the DELETE names it even after the token changed.
 *
 * A sync that fails (offline, server down) is retried with a backoff while the app
 * is open, as soon as the network comes back, and when the app next comes to the
 * foreground. Its outcome is kept in `usePushSyncStatus` for the settings screen.
 */
import * as Notifications from "expo-notifications"
import * as Network from "expo-network"
import notifee from "@notifee/react-native"
import * as Sentry from "@sentry/react-native"
import { isAxiosError } from "axios"
import { AppState, Platform } from "react-native"
import { create } from "zustand"
import { userLocale } from "@/i18n"
import { useSettingsStore } from "@/models/settings/settings"
import type { PushDevice } from "@/services/api"

export type AlertsPermission = "granted" | "denied" | "undetermined"

const toPermission = (status: Notifications.NotificationPermissionsStatus): AlertsPermission =>
  status.granted ? "granted" : status.canAskAgain ? "undetermined" : "denied"

/**
 * Whether pushes can be shown: the app's permission and, on Android, the feature's own channel,
 * which can be muted on its own in the system settings (that counts as denied: it cannot be asked for).
 */
export const getPushPermission = async (channelId?: string): Promise<AlertsPermission> => {
  const permission = toPermission(await Notifications.getPermissionsAsync())
  if (permission !== "granted" || !channelId || Platform.OS !== "android") return permission
  try {
    return (await notifee.isChannelBlocked(channelId)) ? "denied" : "granted"
  } catch {
    return permission
  }
}

export const requestPushPermission = async (channelId?: string): Promise<AlertsPermission> => {
  const permission = toPermission(
    await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
  )
  return permission === "granted" ? getPushPermission(channelId) : permission
}

export const getPushToken = async (): Promise<string> => String((await Notifications.getDevicePushTokenAsync()).data)

// --- the outcome, for the settings screen ---------------------------------------------

/**
 * - ok: the server holds what the user asked for (or nothing was asked for);
 * - noPermission: not sent, as nothing could be shown (the screens say so already);
 * - offline: the server could not be reached; it is retried;
 * - failed: this device could not be registered (no push token, the server refused); it is retried.
 */
export type PushSyncStatus = "ok" | "noPermission" | "offline" | "failed"

export const usePushSyncStatus = create<Record<string, PushSyncStatus>>(() => ({}))

// --- the engine ------------------------------------------------------------------------

type SettingsState = ReturnType<typeof useSettingsStore.getState>

type SyncSpec<T> = {
  /** Names the subscription in analytics, error reports and `usePushSyncStatus`. */
  name: string
  /** The Android channel its pushes are shown on. */
  channelId: string
  /** The list, from the store's state. */
  items: (state: SettingsState) => T[]
  /** The push token the server holds this device's subscription under (null: none, "": unknown), and setting it. */
  registeredToken: (state: SettingsState) => string | null
  setRegisteredToken: (token: string | null) => void
  subscribe: (device: PushDevice, items: T[]) => Promise<void>
  unsubscribe: (token: string) => Promise<void>
}

const RETRY_FIRST_MS = 30_000
const RETRY_MAX_MS = 15 * 60_000

/** Every subscription's sync, so a permission granted anywhere re-syncs them all. */
const syncs = new Set<() => Promise<boolean>>()

/** Sync every subscription now (after the permission was granted in the app, say). */
export const syncPushSubscriptions = (): void => {
  for (const sync of syncs) void sync()
}

/** No answer at all: the device is offline (or the server unreachable). */
const isOffline = (error: unknown): boolean => isAxiosError(error) && !error.response

/** A passing trouble of the server's (down, overloaded, rate-limited): retried quietly, not reported. */
const isServerTrouble = (error: unknown): boolean =>
  isAxiosError(error) && !!error.response && (error.response.status >= 500 || error.response.status === 429)

/** Returns `watch`: start keeping the server in step for the life of the app. */
export const createSubscriptionSync = <T>(spec: SyncSpec<T>): (() => void) => {
  let inFlight: Promise<boolean> | undefined
  let pending = false
  let needsRetry = false
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let retryDelayMs = RETRY_FIRST_MS
  /** The permission the last sync saw, so a change in the device settings is noticed on return. */
  let lastPermission: AlertsPermission | undefined

  const setStatus = (status: PushSyncStatus) => usePushSyncStatus.setState({ [spec.name]: status })

  /** DELETE the subscription the server holds, under the token it was made with. */
  const dropFromServer = async (heldToken: string) => {
    await spec.unsubscribe(heldToken || (await getPushToken()))
    spec.setRegisteredToken(null)
  }

  const syncOnce = async (): Promise<boolean> => {
    const state = useSettingsStore.getState()
    const items = spec.items(state)
    const heldToken = spec.registeredToken(state)
    try {
      if (items.length === 0) {
        if (heldToken !== null) await dropFromServer(heldToken)
        setStatus("ok")
        return true
      }

      lastPermission = await getPushPermission(spec.channelId)
      if (lastPermission !== "granted") {
        // Nothing could be shown: the server stops pushing until the permission is back.
        if (heldToken !== null) await dropFromServer(heldToken)
        setStatus("noPermission")
        return true
      }

      let token: string
      try {
        token = await getPushToken()
      } catch (error) {
        // No token (no Play services, a simulator, APNs unreachable): reported, and retried.
        Sentry.captureException(error, { tags: { feature: spec.name, step: "push_token" } })
        setStatus("failed")
        return false
      }
      await spec.subscribe({ token, provider: Platform.OS === "ios" ? "ios" : "android", locale: userLocale }, items)
      // A subscription left under an older token would go on being pushed to until APNs / FCM rejects it.
      if (heldToken && heldToken !== token) await spec.unsubscribe(heldToken).catch(() => {})
      spec.setRegisteredToken(token)
      setStatus("ok")
      return true
    } catch (error) {
      // Refused by the server (a bad request, say) or anything unexpected is worth a report.
      if (!isOffline(error) && !isServerTrouble(error)) {
        Sentry.captureException(error, { tags: { feature: spec.name, step: "sync" } })
      }
      setStatus(isOffline(error) ? "offline" : "failed")
      return false
    }
  }

  const scheduleRetry = () => {
    if (retryTimer || AppState.currentState !== "active") return
    retryTimer = setTimeout(() => {
      retryTimer = undefined
      void sync()
    }, retryDelayMs)
    retryDelayMs = Math.min(retryDelayMs * 2, RETRY_MAX_MS)
  }

  const sync = (): Promise<boolean> => {
    if (inFlight) {
      pending = true
      return inFlight
    }
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = undefined
    }
    inFlight = syncOnce()
      .then((ok) => {
        needsRetry = !ok
        if (ok) retryDelayMs = RETRY_FIRST_MS
        else if (!pending) scheduleRetry()
        return ok
      })
      .finally(() => {
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
    syncs.add(sync)

    const wanted = () => {
      const state = useSettingsStore.getState()
      return spec.items(state).length > 0 || spec.registeredToken(state) !== null
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

    // Back online: a sync that failed for want of a network goes through now.
    Network.addNetworkStateListener((network) => {
      if (needsRetry && network.isConnected && network.isInternetReachable !== false) void sync()
    })

    let previous = AppState.currentState
    AppState.addEventListener("change", async (next) => {
      const returned = !!previous.match(/inactive|background/) && next === "active"
      previous = next
      if (next !== "active" && retryTimer) {
        // No retries in the background; the return to the foreground retries.
        clearTimeout(retryTimer)
        retryTimer = undefined
      }
      if (!returned || !wanted()) return
      // The permission may have changed in the device settings meanwhile.
      const permissionChanged = (await getPushPermission(spec.channelId)) !== lastPermission
      if (needsRetry || permissionChanged) void sync()
    })
  }

  return watch
}
