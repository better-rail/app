// Expo entry point. `registerRootComponent` registers the root component as "main",
// which matches the module/component name in the CNG-generated native projects.
import { registerRootComponent } from "expo"
import * as Sentry from "@sentry/react-native"

import App from "./app/app"
import { configureNotifications } from "./app/utils/notification-helpers"

// The EAS release build was hard-crashing at launch: a fatal JS error early in startup got turned
// into a native SIGABRT by expo-updates' ErrorRecovery, with no reason in the crash report — so we
// could never see the actual error. Install a global handler that reports it (Sentry + console)
// and, only during the startup window, swallows fatal errors so a single failing init can't crash
// the launch. After startup, errors propagate to the default handler normally.
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

    // Swallow fatal errors during launch so the app still boots; let post-startup errors fall
    // through to the default handler.
    if (isFatal && withinStartupWindow) return
    if (defaultErrorHandler) defaultErrorHandler(error, isFatal)
  })
}

// Never let notification setup (Firebase Cloud Messaging) hard-crash launch.
Promise.resolve()
  .then(configureNotifications)
  .catch((e) => console.error("[BetterRail] configureNotifications failed:", e))

registerRootComponent(App)

export default App
