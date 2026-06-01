/**
 * withBetterRailIos — main-app iOS native customizations for CNG that can't be expressed in
 * app.config.ts directly:
 *
 *  - withAppNativeModule:      injects the RNBetterRail native module + shared business-logic
 *                              Swift + Route.intentdefinition into the BetterRail app target
 *                              (reproduces the original multi-target membership + intent codegen).
 *  - withAppDelegateShortcuts: adds the react-native-quick-actions-shortcuts performActionFor
 *                              handler to the generated Swift AppDelegate.
 *  - withPodfilePostInstall:   re-applies the BoringSSL flag strip + libc++ C++17 define.
 *
 * Firebase init, URL-scheme/universal-link handling, App Groups, keychain, Live Activity
 * Info.plist keys, fonts and Sentry are handled by app.config.ts + first-party plugins.
 */
const { withAppNativeModule } = require("./withAppNativeModule")
const { withAppDelegateShortcuts } = require("./withAppDelegateShortcuts")
const { withAppBridgingHeader } = require("./withAppBridgingHeader")
const { withPodfilePostInstall } = require("./withPodfilePostInstall")

// NOTE: the watch app's former SPM deps (EasySkeleton, HTMLString) are vendored into
// targets/watch/Vendor and compiled directly into the watch target — apple-targets 4.0.7 can't
// declare SPM packages and its xcodeProjectBeta mod can't be appended to from a later plugin.

const withBetterRailIos = (config) => {
  config = withAppNativeModule(config)
  config = withAppBridgingHeader(config)
  config = withAppDelegateShortcuts(config)
  config = withPodfilePostInstall(config)
  return config
}

module.exports = withBetterRailIos
