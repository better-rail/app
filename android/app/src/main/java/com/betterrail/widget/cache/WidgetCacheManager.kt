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
        
        android.util.Log.d("WidgetCacheManager", "Caching data for key: $cacheKey (originId=$originId, destinationId=$destinationId), routes: ${data.routes.size}")
        
        try {
            val jsonData = gson.toJson(data)
            prefs.edit()
                .putString("data_$cacheKey", jsonData)
                .putLong("timestamp_$cacheKey", System.currentTimeMillis())
                .apply()
            android.util.Log.d("WidgetCacheManager", "Successfully cached data for key: $cacheKey")
        } catch (e: Exception) {
            // Fail silently if caching fails
            android.util.Log.e("WidgetCacheManager", "Failed to cache data for key: $cacheKey", e)
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
        return getCachedData(context, originId, destinationId, widgetData.updateFrequencyMinutes)
    }
    
    fun hasCachedDataForWidget(context: Context, appWidgetId: Int, originId: String, destinationId: String): Boolean {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        return hasCachedData(context, originId, destinationId, widgetData.updateFrequencyMinutes)
    }
    
    fun clearExpiredCacheForWidget(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        clearExpiredCache(context, widgetData.updateFrequencyMinutes)
    }
}