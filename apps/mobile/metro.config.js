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

// Release bundles (store/preview builds, scripts/eas-update.sh) must not ship Heebo instead. This checks up front:
// the font requires sit in a try block, so Metro would swallow a resolver error and bundle them as null.
if (process.env.APP_VARIANT === "production") {
  const fontsSource = fs.readFileSync(path.join(__dirname, "src/theme/fonts/index.ts"), "utf8")
  const missing = [...fontsSource.matchAll(/assets\/fonts\/licensed\/([^"]+)/g)]
    .map(([, file]) => file)
    .filter((file) => !fs.existsSync(path.join(licensedFonts, file)))
  if (missing.length > 0) {
    throw new Error(
      `Licensed fonts missing from assets/fonts/licensed: ${missing.join(", ")}. Add them locally, or set the LICENSED_FONTS_ZIP EAS file variable (see scripts/licensed-fonts.mjs).`,
    )
  }
}

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
