// App entry point — runs before the Expo Router root component mounts.
//
// 1. Configure Unistyles FIRST, before any route module (every screen now uses
//    `StyleSheet.create` from react-native-unistyles) is evaluated by expo-router's
//    require.context. Importing it in `app/_layout` is too late — routes resolve first.
// 2. Install the startup-time error / notification guards.
// 3. Hand off to expo-router/entry LAST (it builds the route tree + registers the root).
import "./src/theme/unistyles"
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

// Hand off to Expo Router last — it imports the app/ route tree (whose screens rely on
// Unistyles already being configured above) and registers the root component.
require("expo-router/entry")
