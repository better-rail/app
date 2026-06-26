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
  // Generates Assets.xcassets/AppIcon.appiconset AND sets
  // ASSETCATALOG_COMPILER_APPICON_NAME=AppIcon on the watch target — apple-targets only sets that
  // when an icon is provided. Without it the watch app ships no CFBundleIconName and App Store
  // validation rejects it (ITMS-90713 / ITMS-90391). The appiconset is regenerated each prebuild
  // (git-ignored). watchOS can't use the main app's Icon Composer .icon, so we point at the same
  // train artwork flattened to a raster — apple-targets builds the watchOS appiconset from it.
  icon: "../../assets/icons/ios-icon-light.png",
  entitlements: {
    "com.apple.security.application-groups": ["group.il.co.better-rail"],
  },
}
