/**
 * BetterRailNotificationService — moves the ride's arrival alarm (AlarmKit) when an arrival-alarm
 * push says the arrival time changed. It runs even when the app was force-quit, unlike a silent push.
 *
 * Shares the alarm state with the app through the app group. ArrivalAlarm.swift is also compiled
 * into the app (see plugins/withBetterRailIos/withAppNativeModule.js).
 *
 * @type {import('@bacons/apple-targets/app.plugin').Config}
 */
module.exports = {
  type: "notification-service",
  name: "BetterRailNotificationService",
  bundleIdentifier: ".NotificationService",
  deploymentTarget: "16.4",
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
