/**
 * BetterRailWidgetWatch — watchOS WidgetKit extension, embedded in the BetterRailWatch app.
 * Bundle id preserved as il.co.better-rail.watchkitapp.BetterRailWidget. Uses the legacy
 * SiriKit RouteIntent (pre-generated RouteIntent.swift/INStation.swift in this folder), so
 * Intents is added to the frameworks.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "watch-widget",
  name: "BetterRailWidgetWatch",
  bundleIdentifier: ".watchkitapp.BetterRailWidget",
  deploymentTarget: "10.0",
  frameworks: ["SwiftUI", "Intents"],
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
