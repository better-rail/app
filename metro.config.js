// Learn more: https://docs.expo.dev/guides/customizing-metro/
const { getSentryExpoConfig } = require("@sentry/react-native/metro")

// Use Sentry's Expo-aware Metro config (NOT the bare-RN withSentryConfig). withSentryConfig
// installs a serializer that crashes Expo's production bundle (`expo export:embed --eager`)
// in determineDebugIdFromBundleSource — getSentryExpoConfig wires Sentry's debug-id handling
// through Expo's serializer instead. It calls Expo's getDefaultConfig internally.
/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname)

module.exports = config
