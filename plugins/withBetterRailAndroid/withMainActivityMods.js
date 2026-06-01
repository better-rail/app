const { withMainActivity } = require("@expo/config-plugins")

/**
 * Adds the react-native-screens fragment factory (New Architecture) and deep-link onNewIntent
 * forwarding to the Expo-generated MainActivity.kt.
 *
 * Expo already generates an onCreate() and imports Bundle, so we merge the fragment-factory line
 * into the existing onCreate (before super.onCreate) rather than adding a second one.
 */
const IMPORTS = `import android.content.Intent
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory`

const ON_NEW_INTENT = `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
`

const withMainActivityMods = (config) =>
  withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents

    if (!src.includes("RNScreensFragmentFactory")) {
      // imports (Bundle is already imported by the Expo template)
      src = src.replace(/(package [^\n]+\n)/, `$1\n${IMPORTS}\n`)

      // Set the RNScreens fragment factory before the existing super.onCreate(...) call.
      src = src.replace(
        /(\n)(\s*)super\.onCreate\(/,
        `$1$2supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()\n$2super.onCreate(`,
      )

      // Add onNewIntent as a new method after getMainComponentName().
      src = src.replace(/(override fun getMainComponentName\(\): String = "[^"]*"\n)/, `$1${ON_NEW_INTENT}`)
    }

    cfg.modResults.contents = src
    return cfg
  })

module.exports = { withMainActivityMods }
