const { withDangerousMod } = require("@expo/config-plugins")
const fs = require("fs")
const path = require("path")

/**
 * Copies the custom Android widget system into the generated project:
 *   - Kotlin: com/betterrail/widget/** + com/betterrail/modules/** (from ./android-native/java)
 *   - Resources: widget layouts/drawables/xml/raw + renamed, additive values files
 *     (./android-native/res — pre-pruned of files Expo generates: mipmaps, styles,
 *      network_security_config, rn_edit_text_material; strings/colors renamed to
 *      betterrail_* with app_name removed to merge instead of clobber).
 */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

const withAndroidNativeSources = (config) =>
  withDangerousMod(config, [
    "android",
    (cfg) => {
      const root = cfg.modRequest.projectRoot
      const androidMain = path.join(cfg.modRequest.platformProjectRoot, "app", "src", "main")

      // Kotlin sources
      copyDir(path.join(root, "android-native", "java", "com", "betterrail"), path.join(androidMain, "java", "com", "betterrail"))
      // Resources (merged additively into the Expo-generated res/)
      copyDir(path.join(root, "android-native", "res"), path.join(androidMain, "res"))

      return cfg
    },
  ])

module.exports = { withAndroidNativeSources }
