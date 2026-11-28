/**
 * device-sync.ts — keeps the server's copy of this device (its recurring rides and push token) up to date.
 *
 * Only a device with recurring rides talks to `/device`: the first saved ride creates the identity, a change to
 * what the server holds (rides, push token, language, app version) syncs it, and removing the last ride deletes
 * it. Nothing changed means no request, so calling this on every launch is cheap.
 */
import { AppState, Platform } from "react-native"
import * as Notifications from "expo-notifications"
import * as Crypto from "expo-crypto"
import { getVersion } from "react-native-device-info"

import * as storage from "@/utils/storage"
import { userLocale } from "@/i18n"
import { useRecurringRidesStore } from "@/models/recurring-rides/recurring-rides"
import { deviceApi, type DeviceSyncState } from "@/services/api/device-api"
import { peekDeviceIdentity } from "@/services/device/identity"
import { pushToStartToken } from "@/utils/ios-helpers"

/** A hash of the state the server last accepted, so an unchanged state isn't sent again. */
const LAST_SYNC_KEY = "device_last_sync"

const buildState = async (): Promise<DeviceSyncState> => {
  const token = String((await Notifications.getDevicePushTokenAsync()).data)
  // iOS 17.2+: the token the server starts the ride's Live Activity with. Without one, it reminds instead.
  const pushToStart = Platform.OS === "ios" ? await pushToStartToken().catch(() => null) : null
  return {
    platform: Platform.OS === "ios" ? "ios" : "android",
    locale: userLocale,
    appVersion: getVersion(),
    tokens: Platform.OS === "ios" ? { apns: token, ...(pushToStart && { pushToStart }) } : { fcm: token },
    supportsPushToStart: Boolean(pushToStart),
    recurringRides: useRecurringRidesStore.getState().rides,
  }
}

const syncNow = async () => {
  if (useRecurringRidesStore.getState().rides.length === 0) {
    // Nothing to remind about: forget the device on the server too, if it was ever there.
    if (await peekDeviceIdentity()) await deviceApi.deleteDevice()
    storage.remove(LAST_SYNC_KEY)
    return
  }

  const state = await buildState()
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify(state))
  if (hash === storage.load(LAST_SYNC_KEY) && (await peekDeviceIdentity())) return

  await deviceApi.syncDevice(state)
  storage.save(LAST_SYNC_KEY, hash)
}

let queue: Promise<void> = Promise.resolve()

/** After a failed sync, try again after these delays; past them, the next change or foreground does. */
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000]
let retryAttempt = 0
let retryTimer: ReturnType<typeof setTimeout> | undefined

/** Sync the device, one call at a time. A failed sync stays unsynced and is retried a few times. */
export const syncDevice = () => {
  clearTimeout(retryTimer)
  queue = queue.then(syncNow).then(
    () => {
      retryAttempt = 0
    },
    () => {
      const delay = RETRY_DELAYS_MS[retryAttempt++]
      if (delay) retryTimer = setTimeout(syncDevice, delay)
    },
  )
  return queue
}

let tokenSubscription: Notifications.Subscription | undefined
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined

/** Sync once now, and again whenever the rides or the push token change. */
export const startDeviceSync = () => {
  syncDevice()
  useRecurringRidesStore.subscribe((state, previous) => {
    if (state.rides !== previous.rides) syncDevice()
  })
  tokenSubscription?.remove()
  tokenSubscription = Notifications.addPushTokenListener(() => syncDevice())
  // Unchanged state sends nothing, so syncing on every foreground only costs a request after a failure.
  appStateSubscription?.remove()
  appStateSubscription = AppState.addEventListener("change", (state) => {
    if (state !== "active") return
    retryAttempt = 0
    syncDevice()
  })
}
