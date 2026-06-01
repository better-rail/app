/**
 * BetterRailWatch — watchOS companion app (SwiftUI). Bundle id preserved as
 * il.co.better-rail.watchkitapp; apple-targets sets WKCompanionAppBundleIdentifier to the
 * main app automatically.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "watch",
  name: "BetterRailWatch",
  bundleIdentifier: ".watchkitapp",
  deploymentTarget: "9.0",
  frameworks: ["SwiftUI"],
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
