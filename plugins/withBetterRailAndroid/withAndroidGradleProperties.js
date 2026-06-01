const { withGradleProperties } = require("@expo/config-plugins")

/**
 * Enables Jetifier (as in the original project) so legacy `com.android.support:*` artifacts
 * pulled in transitively by older React Native libraries are rewritten to AndroidX. Without it
 * the build fails with "Duplicate class android.support.v4.* found in core / support-compat".
 */
const withAndroidGradleProperties = (config) =>
  withGradleProperties(config, (cfg) => {
    const props = cfg.modResults
    const upsert = (key, value) => {
      const existing = props.find((p) => p.type === "property" && p.key === key)
      if (existing) existing.value = value
      else props.push({ type: "property", key, value })
    }
    upsert("android.useAndroidX", "true")
    upsert("android.enableJetifier", "true")
    return cfg
  })

module.exports = { withAndroidGradleProperties }
