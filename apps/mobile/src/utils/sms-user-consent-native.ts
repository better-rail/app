import { NativeEventEmitter, NativeModules, Platform } from "react-native"

// Android's SMS User Consent API: the rider approves sharing one SMS, so the app needs no SMS permission.
// Missing on iOS, and on binaries older than the module (an OTA update can reach one).
const native = Platform.OS === "android" ? NativeModules.SmsUserConsent : undefined
const emitter = native ? new NativeEventEmitter(native) : undefined

/** Listens for the next SMS for up to five minutes, replacing an earlier listen. False when it can't listen. */
export async function startSmsUserConsent(): Promise<boolean> {
  if (!native) return false
  try {
    return await native.start()
  } catch {
    return false
  }
}

export function stopSmsUserConsent() {
  native?.stop()
}

/** Calls `onMessage` with the SMS the rider shared, including one shared before subscribing. Returns the unsubscribe. */
export function subscribeToSmsUserConsent(onMessage: (message: string) => void) {
  if (!native || !emitter) return () => {}

  let isSubscribed = true
  const subscription = emitter.addListener("SmsUserConsentMessage", onMessage)
  native.consumePendingMessage().then((message: string | null) => {
    if (isSubscribed && message) onMessage(message)
  })

  return () => {
    isSubscribed = false
    subscription.remove()
  }
}
