/**
 * withBetterRailAndroid — reproduces the custom Android widget system under CNG:
 *   - withAndroidNativeSources: copies the widget + modules Kotlin and widget resources.
 *   - withAndroidGradle:        Hilt/Room/DataStore/WorkManager/OkHttp/Gson/coroutines deps,
 *                               kapt + Hilt plugins, buildConfig fields, flavor strategy, and
 *                               the Google Services gradle plugin (for expo-notifications FCM).
 *   - withAndroidManifestMods:  widget receivers, update receiver, RemoteViews service,
 *                               config activities, notification icon.
 *   - withMainApplicationHilt:  @HiltAndroidApp + widget lifecycle management.
 *   - withMainActivityMods:     RNScreens fragment factory + deep-link onNewIntent.
 *
 * google-services.json comes from app.config.ts (android.googleServicesFile); permissions and
 * the betterrail:// deep link are also declared there.
 */
const { withAndroidNativeSources } = require("./withAndroidNativeSources")
const { withAndroidGradle } = require("./withAndroidGradle")
const { withAndroidGradleProperties } = require("./withAndroidGradleProperties")
const { withAndroidManifestMods } = require("./withAndroidManifestMods")
const { withMainApplicationHilt } = require("./withMainApplicationHilt")
const { withMainActivityMods } = require("./withMainActivityMods")

const withBetterRailAndroid = (config) => {
  config = withAndroidGradle(config)
  config = withAndroidGradleProperties(config)
  config = withAndroidManifestMods(config)
  config = withMainApplicationHilt(config)
  config = withMainActivityMods(config)
  // Source/resource copy runs as a dangerous mod (after the generated project exists).
  config = withAndroidNativeSources(config)
  return config
}

module.exports = withBetterRailAndroid
