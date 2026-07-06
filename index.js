// Early setup — runs before the Expo Router root component mounts.
// expo-router/entry handles registerRootComponent; this file handles
// startup-time configuration that must run before the React tree.
import * as Sentry from "@sentry/react-native"
import { configureNotifications } from "./src/utils/notification-helpers"

// Guard fatal startup errors so a single failing init can't crash launch.
// After the startup window closes, errors propagate to the default handler.
const defaultErrorHandler = global.ErrorUtils && global.ErrorUtils.getGlobalHandler()
let withinStartupWindow = true
setTimeout(() => {
  withinStartupWindow = false
}, 8000)

if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    try {
      // eslint-disable-next-line no-console
      console.error("[BetterRail] startup error", { isFatal, message: error && error.message }, error)
      if (Sentry && Sentry.captureException) Sentry.captureException(error)
    } catch (_) {}

    if (isFatal && withinStartupWindow) return
    if (defaultErrorHandler) defaultErrorHandler(error, isFatal)
  })
}

// Never let notification setup (expo-notifications FCM task) hard-crash launch.
Promise.resolve()
  .then(configureNotifications)
  .catch((e) => console.error("[BetterRail] configureNotifications failed:", e))
