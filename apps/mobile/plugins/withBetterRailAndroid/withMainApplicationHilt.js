const { withMainApplication } = require("@expo/config-plugins")

/**
 * Adds @HiltAndroidApp (required for the widget's Hilt DI graph), the widget lifecycle
 * management (WidgetLifecycleObserver init + memory-pressure cleanup) and the local
 * WidgetNavigationPackage to the Expo-generated MainApplication.kt.
 */
const IMPORTS = `import android.content.ComponentCallbacks2
import android.util.Log
import com.betterrail.modules.WidgetNavigationPackage
import com.betterrail.widget.lifecycle.WidgetCoroutineManager
import com.betterrail.widget.lifecycle.WidgetLifecycleObserver
import com.betterrail.widget.test.TestConfig
import dagger.hilt.android.HiltAndroidApp`

const LIFECYCLE_MEMBERS = `
  private var widgetLifecycleObserver: WidgetLifecycleObserver? = null

  override fun onTerminate() {
    super.onTerminate()
    widgetLifecycleObserver?.onApplicationDestroy()
  }

  override fun onLowMemory() {
    super.onLowMemory()
    widgetLifecycleObserver?.onLowMemory()
  }

  override fun onTrimMemory(level: Int) {
    super.onTrimMemory(level)
    if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
      WidgetCoroutineManager.getInstance().cleanupInactiveScopes()
    }
  }
`

const ONCREATE_INIT = `
    try {
      widgetLifecycleObserver = WidgetLifecycleObserver.initialize(this)
      widgetLifecycleObserver?.onApplicationCreated()
    } catch (e: Exception) {
      Log.e("MainApplication", "Failed to init widget lifecycle", e)
    }
    TestConfig.enableMockModeForDebug(this)`

const withMainApplicationHilt = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents

    if (!src.includes("dagger.hilt.android.HiltAndroidApp")) {
      // imports
      src = src.replace(/(package [^\n]+\n)/, `$1\n${IMPORTS}\n`)
      // annotation
      src = src.replace(/class MainApplication\s*:/, "@HiltAndroidApp\nclass MainApplication :")
      // onCreate init (after super.onCreate())
      src = src.replace(/(override fun onCreate\(\)\s*{\s*\n\s*super\.onCreate\(\)\n)/, `$1${ONCREATE_INIT}\n`)
      // lifecycle override methods before the final closing brace of the file
      src = src.replace(/\n}\s*$/, `\n${LIFECYCLE_MEMBERS}}\n`)
    }

    // Separate guard so it also applies to an already-prebuilt android/ dir.
    if (!src.includes("WidgetNavigationPackage()")) {
      if (!src.includes("import com.betterrail.modules.WidgetNavigationPackage")) {
        src = src.replace(/(package [^\n]+\n)/, "$1\nimport com.betterrail.modules.WidgetNavigationPackage\n")
      }
      src = src.replace(/(\/\/ add\(MyReactNativePackage\(\)\)\n)/, "$1          add(WidgetNavigationPackage())\n")
    }

    cfg.modResults.contents = src
    return cfg
  })

module.exports = { withMainApplicationHilt }
