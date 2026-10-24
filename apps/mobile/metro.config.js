// Learn more: https://docs.expo.dev/guides/customizing-metro/
const fs = require("fs")
const path = require("path")
const { getSentryExpoConfig } = require("@sentry/react-native/metro")

// Use Sentry's Expo-aware Metro config (NOT the bare-RN withSentryConfig). withSentryConfig
// installs a serializer that crashes Expo's production bundle (`expo export:embed --eager`)
// in determineDebugIdFromBundleSource — getSentryExpoConfig wires Sentry's debug-id handling
// through Expo's serializer instead. It calls Expo's getDefaultConfig internally.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

// Licensed fonts are gitignored (this repo is public), so checkouts without them bundle Heebo in their place
const licensedFonts = path.join(__dirname, "assets/fonts/licensed")
const licensedFontFallback = path.join(__dirname, "assets/fonts/Heebo-Bold.otf")
const resolveRequest = config.resolver.resolveRequest

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = resolveRequest ?? context.resolveRequest
  // Only relative font imports: the font asset's own bare imports (its asset registry) resolve normally
  if (moduleName.startsWith(".") && /\.(ttf|otf)$/.test(moduleName)) {
    const target = path.resolve(path.dirname(context.originModulePath), moduleName)
    if (target.startsWith(licensedFonts) && !fs.existsSync(target)) {
      return resolve(context, licensedFontFallback, platform)
    }
  }
  return resolve(context, moduleName, platform)
}

module.exports = config
