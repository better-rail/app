package com.betterrail.modules

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import android.util.Log
import android.content.Context

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