/**
 * StationIntent — Siri intents-service extension that handles RouteIntent (origin/destination
 * station resolution + defaults). Bundle id preserved as `il.co.better-rail.StationIntent`.
 *
 * `name: "StationIntent"` makes PRODUCT_MODULE_NAME = StationIntent, matching the Info.plist
 * principal class `$(PRODUCT_MODULE_NAME).IntentHandler`.
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "intent",
  name: "StationIntent",
  bundleIdentifier: ".StationIntent",
  deploymentTarget: "16.4",
  frameworks: ["Intents"],
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
