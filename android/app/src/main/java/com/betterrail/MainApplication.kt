package com.betterrail

import android.app.Application
import android.content.ComponentCallbacks2
import android.util.Log
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader
import com.betterrail.widget.lifecycle.WidgetCoroutineManager
import com.betterrail.widget.lifecycle.WidgetLifecycleObserver
import com.betterrail.widget.test.TestConfig
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MainApplication : Application(), ReactApplication {

  companion object {
    private const val TAG = "MainApplication"
  }
  
  private lateinit var widgetLifecycleObserver: WidgetLifecycleObserver

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    
    // Initialize React Native
    loadReactNative(this)
    
    // Initialize widget lifecycle management
    try {
      Log.d(TAG, "Initializing widget lifecycle management")
      widgetLifecycleObserver = WidgetLifecycleObserver.initialize(this)
      widgetLifecycleObserver.onApplicationCreated()
      Log.d(TAG, "Widget lifecycle management initialized successfully")
    } catch (e: Exception) {
      Log.e(TAG, "Failed to initialize widget lifecycle management", e)
    }
    
    // Initialize test config (logs available test route)
    TestConfig.enableMockModeForDebug(this)
  }
  
  override fun onTerminate() {
    Log.d(TAG, "Application terminating")
    super.onTerminate()
    
    // Cleanup widget coroutines
    try {
      widgetLifecycleObserver.onApplicationDestroy()
    } catch (e: Exception) {
      Log.e(TAG, "Error during application termination", e)
    }
  }
  
  override fun onLowMemory() {
    Log.d(TAG, "Low memory - performing widget cleanup")
    super.onLowMemory()
    
    try {
      widgetLifecycleObserver.onLowMemory()
    } catch (e: Exception) {
      Log.e(TAG, "Error during low memory cleanup", e)
    }
  }
  
  override fun onTrimMemory(level: Int) {
    Log.d(TAG, "Memory trim level: $level")
    super.onTrimMemory(level)
    
    try {
      // Respond to memory pressure by cleaning up inactive widget scopes
      // Use a simple threshold approach instead of deprecated specific constants
      if (level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN) {
        Log.d(TAG, "Memory pressure detected, performing widget cleanup")
        WidgetCoroutineManager.getInstance().cleanupInactiveScopes()
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error during memory trim", e)
    }
  }
}
