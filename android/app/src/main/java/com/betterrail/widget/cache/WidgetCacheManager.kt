package com.betterrail.widget.cache

import android.content.Context
import android.content.SharedPreferences
import com.betterrail.widget.data.WidgetScheduleData
import com.betterrail.widget.data.WidgetPreferences
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException

object WidgetCacheManager {
    private const val PREFS_NAME = "widget_cache"
    
    private val gson = Gson()
    
    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    private fun getCacheKey(originId: String, destinationId: String): String {
        return "${originId}_${destinationId}"
    }
    
    private fun getCacheKeyWithWidget(appWidgetId: Int, originId: String, destinationId: String): String {
        return "widget_${appWidgetId}_${originId}_${destinationId}"
    }
    
    fun getCachedData(context: Context, originId: String, destinationId: String, maxAgeMinutes: Int): WidgetScheduleData? {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Getting cached data for key: $cacheKey (originId=$originId, destinationId=$destinationId)")
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return null.also {
            android.util.Log.d("WidgetCacheManager", "No cached JSON found for key: $cacheKey")
        }
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        // Check if cache is still valid using the configured max age
        val maxAgeMs = maxAgeMinutes * 60 * 1000L
        val currentTime = System.currentTimeMillis()
        val age = currentTime - cachedTimestamp
        
        android.util.Log.d("WidgetCacheManager", "Cache age: ${age}ms, max age: ${maxAgeMs}ms (${maxAgeMinutes}min) for key: $cacheKey")
        
        if (age > maxAgeMs) {
            // Cache expired, remove it
            android.util.Log.d("WidgetCacheManager", "Cache expired for key: $cacheKey, removing")
            prefs.edit()
                .remove("data_$cacheKey")
                .remove("timestamp_$cacheKey")
                .apply()
            return null
        }
        
        return try {
            val data = gson.fromJson(cachedJson, WidgetScheduleData::class.java)
            android.util.Log.d("WidgetCacheManager", "Successfully retrieved cached data for key: $cacheKey, routes: ${data?.routes?.size ?: 0}")
            data
        } catch (e: JsonSyntaxException) {
            // Invalid cached data, remove it
            android.util.Log.e("WidgetCacheManager", "Invalid cached data for key: $cacheKey, removing", e)
            prefs.edit()
                .remove("data_$cacheKey")
                .remove("timestamp_$cacheKey")
                .apply()
            null
        }
    }
    
    fun hasCachedData(context: Context, originId: String, destinationId: String, maxAgeMinutes: Int): Boolean {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return false
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        val maxAgeMs = maxAgeMinutes * 60 * 1000L
        return (System.currentTimeMillis() - cachedTimestamp <= maxAgeMs)
    }
    
    fun cacheData(context: Context, originId: String, destinationId: String, data: WidgetScheduleData) {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Caching timetable data for route: $cacheKey (originId=$originId, destinationId=$destinationId), routes: ${data.routes.size}")
        
        try {
            val jsonData = gson.toJson(data)
            prefs.edit()
                .putString("data_$cacheKey", jsonData)
                .putLong("timestamp_$cacheKey", System.currentTimeMillis())
                .putString("route_$cacheKey", "${originId}->${destinationId}") // Store route info for easier identification
                .apply()
            android.util.Log.d("WidgetCacheManager", "Successfully cached timetable data for route: $cacheKey")
        } catch (e: Exception) {
            // Fail silently if caching fails
            android.util.Log.e("WidgetCacheManager", "Failed to cache timetable data for route: $cacheKey", e)
        }
    }
    
    /**
     * Caches data using widget-specific key to avoid collisions between widgets
     */
    fun cacheDataForWidget(context: Context, appWidgetId: Int, originId: String, destinationId: String, data: WidgetScheduleData) {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKeyWithWidget(appWidgetId, originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Caching timetable data for widget: $cacheKey (appWidgetId=$appWidgetId, route=${originId}->${destinationId}), routes: ${data.routes.size}")
        
        try {
            val jsonData = gson.toJson(data)
            prefs.edit()
                .putString("data_$cacheKey", jsonData)
                .putLong("timestamp_$cacheKey", System.currentTimeMillis())
                .putString("route_$cacheKey", "${originId}->${destinationId}")
                .putInt("widget_id_$cacheKey", appWidgetId)
                .apply()
            
            // Also cache at the route level for sharing between widgets with same route
            cacheData(context, originId, destinationId, data)
            
            android.util.Log.d("WidgetCacheManager", "Successfully cached timetable data for widget and route: $cacheKey")
        } catch (e: Exception) {
            // Fail silently if caching fails
            android.util.Log.e("WidgetCacheManager", "Failed to cache timetable data for widget: $cacheKey", e)
        }
    }
    
    fun clearExpiredCache(context: Context, maxAgeMinutes: Int) {
        val prefs = getSharedPreferences(context)
        val editor = prefs.edit()
        val allEntries = prefs.all
        var hasExpired = false
        
        val maxAgeMs = maxAgeMinutes * 60 * 1000L
        
        for ((key, value) in allEntries) {
            if (key.startsWith("timestamp_")) {
                val timestamp = value as? Long ?: 0L
                if (System.currentTimeMillis() - timestamp > maxAgeMs) {
                    val cacheKey = key.removePrefix("timestamp_")
                    editor.remove("data_$cacheKey")
                    editor.remove("timestamp_$cacheKey")
                    hasExpired = true
                }
            }
        }
        
        if (hasExpired) {
            editor.apply()
        }
    }
    
    fun clearRouteCache(context: Context, originId: String, destinationId: String) {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        prefs.edit()
            .remove("data_$cacheKey")
            .remove("timestamp_$cacheKey")
            .apply()
    }
    
    fun clearAllCache(context: Context) {
        getSharedPreferences(context).edit().clear().apply()
    }
    
    fun getCachedDataForWidget(context: Context, appWidgetId: Int, originId: String, destinationId: String): WidgetScheduleData? {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        return getCachedDataWithWidgetId(context, appWidgetId, originId, destinationId, widgetData.updateFrequencyMinutes)
    }
    
    /**
     * Get the most recent cached data for any widget with this route
     * Useful as a fallback when widget-specific cache is empty
     */
    fun getMostRecentCachedDataForRoute(context: Context, originId: String, destinationId: String): WidgetScheduleData? {
        val prefs = getSharedPreferences(context)
        val allEntries = prefs.all
        val routeString = "${originId}->${destinationId}"
        
        var mostRecentData: WidgetScheduleData? = null
        var mostRecentTimestamp = 0L
        
        // Check route-level cache first
        val routeCacheKey = getCacheKey(originId, destinationId)
        val routeData = prefs.getString("data_$routeCacheKey", null)
        val routeTimestamp = prefs.getLong("timestamp_$routeCacheKey", 0L)
        
        if (routeData != null && routeTimestamp > mostRecentTimestamp) {
            try {
                mostRecentData = gson.fromJson(routeData, WidgetScheduleData::class.java)
                mostRecentTimestamp = routeTimestamp
            } catch (e: Exception) {
                android.util.Log.e("WidgetCacheManager", "Failed to parse route cache data", e)
            }
        }
        
        // Check widget-specific caches for this route
        for ((key, value) in allEntries) {
            if (key.startsWith("route_") && value == routeString) {
                val cacheKey = key.removePrefix("route_")
                val timestamp = prefs.getLong("timestamp_$cacheKey", 0L)
                
                if (timestamp > mostRecentTimestamp) {
                    val cachedJson = prefs.getString("data_$cacheKey", null)
                    if (cachedJson != null) {
                        try {
                            mostRecentData = gson.fromJson(cachedJson, WidgetScheduleData::class.java)
                            mostRecentTimestamp = timestamp
                        } catch (e: Exception) {
                            android.util.Log.e("WidgetCacheManager", "Failed to parse widget cache data", e)
                        }
                    }
                }
            }
        }
        
        android.util.Log.d("WidgetCacheManager", "Most recent cached data for route ${originId}->${destinationId}: ${mostRecentData?.routes?.size ?: 0} routes (timestamp: $mostRecentTimestamp)")
        return mostRecentData
    }
    
    /**
     * Gets cached data using widget-specific cache key to avoid collisions between widgets
     */
    fun getCachedDataWithWidgetId(context: Context, appWidgetId: Int, originId: String, destinationId: String, maxAgeMinutes: Int): WidgetScheduleData? {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKeyWithWidget(appWidgetId, originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Getting cached data for widget-specific key: $cacheKey (appWidgetId=$appWidgetId, originId=$originId, destinationId=$destinationId)")
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return null.also {
            android.util.Log.d("WidgetCacheManager", "No cached JSON found for widget-specific key: $cacheKey")
        }
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        // Check if cache is still valid using the configured max age
        val maxAgeMs = maxAgeMinutes * 60 * 1000L
        val currentTime = System.currentTimeMillis()
        val age = currentTime - cachedTimestamp
        
        android.util.Log.d("WidgetCacheManager", "Widget-specific cache age: ${age}ms, max age: ${maxAgeMs}ms (${maxAgeMinutes}min) for key: $cacheKey")
        
        if (age > maxAgeMs) {
            // Cache expired, remove it
            android.util.Log.d("WidgetCacheManager", "Widget-specific cache expired for key: $cacheKey, removing")
            prefs.edit()
                .remove("data_$cacheKey")
                .remove("timestamp_$cacheKey")
                .apply()
            return null
        }
        
        return try {
            val data = gson.fromJson(cachedJson, WidgetScheduleData::class.java)
            android.util.Log.d("WidgetCacheManager", "Successfully retrieved widget-specific cached data for key: $cacheKey, routes: ${data?.routes?.size ?: 0}")
            data
        } catch (e: JsonSyntaxException) {
            // Invalid cached data, remove it
            android.util.Log.e("WidgetCacheManager", "Invalid widget-specific cached data for key: $cacheKey, removing", e)
            prefs.edit()
                .remove("data_$cacheKey")
                .remove("timestamp_$cacheKey")
                .apply()
            null
        }
    }

    /**
     * Gets cached data ignoring expiration time - useful as fallback when API fails
     */
    fun getCachedDataIgnoreAge(context: Context, appWidgetId: Int, originId: String, destinationId: String): WidgetScheduleData? {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKeyWithWidget(appWidgetId, originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Getting cached data (ignoring age) for widget-specific key: $cacheKey")
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return null.also {
            android.util.Log.d("WidgetCacheManager", "No cached JSON found for fallback key: $cacheKey")
        }
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        val age = System.currentTimeMillis() - cachedTimestamp
        android.util.Log.d("WidgetCacheManager", "Using fallback cached data (age: ${age}ms) for key: $cacheKey")
        
        return try {
            val data = gson.fromJson(cachedJson, WidgetScheduleData::class.java)
            android.util.Log.d("WidgetCacheManager", "Successfully retrieved fallback cached data for key: $cacheKey, routes: ${data?.routes?.size ?: 0}")
            data
        } catch (e: JsonSyntaxException) {
            android.util.Log.e("WidgetCacheManager", "Invalid fallback cached data for key: $cacheKey", e)
            null
        }
    }
    
    fun hasCachedDataForWidget(context: Context, appWidgetId: Int, originId: String, destinationId: String): Boolean {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        return hasCachedData(context, originId, destinationId, widgetData.updateFrequencyMinutes)
    }
    
    /**
     * Checks if we have any cached data for this route (fresh or stale) 
     * Useful for determining if widgets can display something immediately
     */
    fun hasAnyCachedDataForRoute(context: Context, originId: String, destinationId: String): Boolean {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        return prefs.getString("data_$cacheKey", null) != null
    }
    
    fun clearExpiredCacheForWidget(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        clearExpiredCache(context, widgetData.updateFrequencyMinutes)
    }
    
    /**
     * Clears cached data for a specific widget when route changes
     */
    fun clearWidgetCache(context: Context, appWidgetId: Int) {
        val prefs = getSharedPreferences(context)
        val editor = prefs.edit()
        val allEntries = prefs.all
        
        // Find and clear all cache entries for this widget
        for ((key, _) in allEntries) {
            if (key.startsWith("widget_${appWidgetId}_") || key.contains("widget_id_")) {
                val value = allEntries[key]
                if (key.contains("widget_id_") && value == appWidgetId) {
                    // This is a widget_id entry, clear the associated cache
                    val cacheKey = key.removePrefix("widget_id_")
                    editor.remove("data_$cacheKey")
                    editor.remove("timestamp_$cacheKey")
                    editor.remove("route_$cacheKey")
                    editor.remove("widget_id_$cacheKey")
                } else if (key.startsWith("widget_${appWidgetId}_")) {
                    editor.remove(key)
                }
            }
        }
        
        editor.apply()
        android.util.Log.d("WidgetCacheManager", "Cleared cache for widget $appWidgetId")
    }
    
    /**
     * Forces a refresh of cached timetable data for a specific route
     * This should be called when we know the route data needs to be updated
     */
    fun invalidateRouteCache(context: Context, originId: String, destinationId: String) {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Invalidating cache for route: ${originId} -> ${destinationId}")
        
        prefs.edit()
            .remove("data_$cacheKey")
            .remove("timestamp_$cacheKey")
            .remove("route_$cacheKey")
            .apply()
            
        // Also invalidate any widget-specific cache for this route
        val editor = prefs.edit()
        val allEntries = prefs.all
        val routeString = "${originId}->${destinationId}"
        
        for ((key, value) in allEntries) {
            if (key.startsWith("route_") && value == routeString) {
                val widgetCacheKey = key.removePrefix("route_")
                editor.remove("data_$widgetCacheKey")
                editor.remove("timestamp_$widgetCacheKey")
                editor.remove("route_$widgetCacheKey")
                editor.remove("widget_id_$widgetCacheKey")
            }
        }
        
        editor.apply()
    }
}