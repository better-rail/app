/**
 * Fingerprint (runtimeVersion) inputs on top of the balanced preset.
 *
 * Plugins copy native code from these folders at prebuild, and bun patches edit native modules
 * that the preset hashes only by name and version. Without them, native changes would keep the
 * old runtime version.
 */
const reasons = ["betterRailNativeSources"]

/** @type {import('expo/fingerprint').Config} */
module.exports = {
  extraSources: [
    { type: "dir", filePath: "android-native", reasons },
    { type: "dir", filePath: "ios-native", reasons },
    { type: "dir", filePath: "targets", reasons },
    { type: "file", filePath: "rnrepo.config.json", reasons },
    { type: "dir", filePath: "../../patches", reasons },
  ],
  ignorePaths: ["**/*.md"],
}
