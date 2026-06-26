/**
 * BetterRailWidget — iOS home-screen widget (WidgetKit) + Live Activities (ActivityKit).
 *
 * Bundle id is preserved as `il.co.better-rail.BetterRailWidget` (leading dot = appended
 * to the main app bundle id) so existing installed widgets keep working.
 *
 * `Intents` is added on top of the default widget frameworks because the widget uses the
 * legacy SiriKit RouteIntent (from Route.intentdefinition), not the AppIntents framework.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "widget",
  name: "BetterRailWidget",
  bundleIdentifier: ".BetterRailWidget",
  deploymentTarget: "16.4",
  frameworks: ["Intents"],
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
