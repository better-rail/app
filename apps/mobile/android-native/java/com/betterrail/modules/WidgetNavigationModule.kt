package com.betterrail.modules

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Intent
import android.util.Log
import android.content.Context
import android.os.Build
import com.betterrail.widget.ModernCompactWidget2x2Provider
import com.betterrail.widget.BaseWidgetConfigActivity
import com.betterrail.widget.CompactWidget4x2ConfigActivity
import com.betterrail.widget.WidgetPinReceiver
import com.betterrail.widget.ModernCompactWidget4x2Provider

@ReactModule(name = WidgetNavigationModule.NAME)
class WidgetNavigationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun getPendingNavigation(promise: Promise) {
        try {
            Log.d("WidgetNavigationModule", "getPendingNavigation called")
            val sharedPrefs = reactApplicationContext.getSharedPreferences("widget_navigation", 0)
            val hasPending = sharedPrefs.getBoolean("has_pending_navigation", false)
            
            Log.d("WidgetNavigationModule", "hasPending: $hasPending")
            
            if (hasPending) {
                val originId = sharedPrefs.getString("pending_origin_id", null)
                val destinationId = sharedPrefs.getString("pending_destination_id", null)
                val originName = sharedPrefs.getString("pending_origin_name", null)
                val destinationName = sharedPrefs.getString("pending_destination_name", null)
                
                Log.d("WidgetNavigationModule", "Pending navigation data:")
                Log.d("WidgetNavigationModule", "  originId: $originId")
                Log.d("WidgetNavigationModule", "  destinationId: $destinationId")
                Log.d("WidgetNavigationModule", "  originName: $originName")
                Log.d("WidgetNavigationModule", "  destinationName: $destinationName")
                
                val navigationData = WritableNativeMap()
                navigationData.putString("originId", originId)
                navigationData.putString("destinationId", destinationId)
                navigationData.putString("originName", originName)
                navigationData.putString("destinationName", destinationName)
                navigationData.putBoolean("hasPending", true)
                
                promise.resolve(navigationData)
            } else {
                Log.d("WidgetNavigationModule", "No pending navigation data")
                val emptyData = WritableNativeMap()
                emptyData.putBoolean("hasPending", false)
                promise.resolve(emptyData)
            }
        } catch (e: Exception) {
            Log.e("WidgetNavigationModule", "Error getting pending navigation", e)
            promise.reject("ERROR", "Failed to get pending navigation", e)
        }
    }

    @ReactMethod
    fun clearPendingNavigation(promise: Promise) {
        try {
            val sharedPrefs = reactApplicationContext.getSharedPreferences("widget_navigation", 0)
            sharedPrefs.edit()
                .remove("pending_origin_id")
                .remove("pending_destination_id")
                .remove("pending_origin_name")
                .remove("pending_destination_name")
                .putBoolean("has_pending_navigation", false)
                .apply()
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to clear pending navigation", e)
        }
    }

    @ReactMethod
    fun getInstalledWidgets(promise: Promise) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            val families = WritableNativeArray()

            val compact2x2Ids = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, ModernCompactWidget2x2Provider::class.java)
            )
            if (compact2x2Ids.isNotEmpty()) {
                families.pushString("compact")
            }

            val compact4x2Ids = appWidgetManager.getAppWidgetIds(
                ComponentName(reactApplicationContext, ModernCompactWidget4x2Provider::class.java)
            )
            if (compact4x2Ids.isNotEmpty()) {
                families.pushString("wide")
            }

            promise.resolve(families)
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to get installed widgets", e)
        }
    }

    /**
     * Pins the 4x2 widget to the home screen. Launchers skip the configure activity for pinned
     * widgets, so the success callback either saves the given route directly (WidgetPinReceiver)
     * or opens the config activity pre-filled. Resolves false when pinning isn't supported.
     */
    @ReactMethod
    fun requestPinWidget(originId: String, destinationId: String, promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                promise.resolve(false)
                return
            }
            val appWidgetManager = AppWidgetManager.getInstance(reactApplicationContext)
            if (!appWidgetManager.isRequestPinAppWidgetSupported) {
                Log.d("WidgetNavigationModule", "Launcher does not support pinning widgets")
                promise.resolve(false)
                return
            }
            val provider = ComponentName(reactApplicationContext, ModernCompactWidget4x2Provider::class.java)
            val hasCompleteRoute = originId.isNotEmpty() && destinationId.isNotEmpty() && originId != destinationId
            val mutableFlag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or mutableFlag
            // Unique request code: PendingIntent identity ignores extras, so a stale callback
            // from an earlier request must not pick up this request's route.
            val requestCode = (System.currentTimeMillis() and 0x7FFFFFFF).toInt()
            val successCallback = if (hasCompleteRoute) {
                val intent = Intent(reactApplicationContext, WidgetPinReceiver::class.java)
                    .putExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_ORIGIN_ID, originId)
                    .putExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_DESTINATION_ID, destinationId)
                PendingIntent.getBroadcast(reactApplicationContext, requestCode, intent, flags)
            } else {
                val intent = Intent(reactApplicationContext, CompactWidget4x2ConfigActivity::class.java)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    .putExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_ORIGIN_ID, originId)
                    .putExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_DESTINATION_ID, destinationId)
                PendingIntent.getActivity(reactApplicationContext, requestCode, intent, flags)
            }
            val requested = appWidgetManager.requestPinAppWidget(provider, null, successCallback)
            Log.d("WidgetNavigationModule", "requestPinAppWidget returned $requested (completeRoute=$hasCompleteRoute)")
            promise.resolve(requested)
        } catch (e: Exception) {
            Log.e("WidgetNavigationModule", "Error requesting widget pin", e)
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for EventEmitter interface
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for EventEmitter interface
    }

    companion object {
        const val NAME = "WidgetNavigation"
    }
}