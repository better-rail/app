package com.betterrail.widget.cache

import android.content.Context
import android.content.SharedPreferences
import com.betterrail.widget.data.WidgetScheduleData
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException

object WidgetCacheManager {
    private const val PREFS_NAME = "widget_cache"
    private const val CACHE_DURATION_MS = 5 * 60 * 1000L // 5 minutes cache
    
    private val gson = Gson()
    
    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    private fun getCacheKey(originId: String, destinationId: String): String {
        return "${originId}_${destinationId}"
    }
    
    fun getCachedData(context: Context, originId: String, destinationId: String, maxAgeMinutes: Int = 5): WidgetScheduleData? {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        android.util.Log.d("WidgetCacheManager", "Getting cached data for key: $cacheKey (originId=$originId, destinationId=$destinationId)")
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return null.also {
            android.util.Log.d("WidgetCacheManager", "No cached JSON found for key: $cacheKey")
        }
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        // Check if cache is still valid (use configurable max age, but cap at CACHE_DURATION_MS)
        val maxAgeMs = minOf(maxAgeMinutes * 60 * 1000L, CACHE_DURATION_MS)
        val currentTime = System.currentTimeMillis()
        val age = currentTime - cachedTimestamp
        
        android.util.Log.d("WidgetCacheManager", "Cache age: ${age}ms, max age: ${maxAgeMs}ms for key: $cacheKey")
        
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
    
    fun hasCachedData(context: Context, originId: String, destinationId: String): Boolean {
        val prefs = getSharedPreferences(context)
        val cacheKey = getCacheKey(originId, destinationId)
        
        val cachedJson = prefs.getString("data_$cacheKey", null) ?: return false
        val cachedTimestamp = prefs.getLong("timestamp_$cacheKey", 0L)
        
        return (System.currentTimeMillis() - cachedTimestamp <= CACHE_DURATION_MS)
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
    
    fun clearExpiredCache(context: Context) {
        val prefs = getSharedPreferences(context)
        val editor = prefs.edit()
        val allEntries = prefs.all
        var hasExpired = false
        
        for ((key, value) in allEntries) {
            if (key.startsWith("timestamp_")) {
                val timestamp = value as? Long ?: 0L
                if (System.currentTimeMillis() - timestamp > CACHE_DURATION_MS) {
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
}