package com.betterrail.widget.utils

import android.content.Context
import android.content.SharedPreferences
import kotlin.math.min
import kotlin.math.pow

object BackoffManager {
    private const val PREFS_NAME = "widget_backoff"
    private const val INITIAL_BACKOFF_MS = 30 * 1000L // 30 seconds
    private const val MAX_BACKOFF_MS = 30 * 60 * 1000L // 30 minutes
    private const val BACKOFF_MULTIPLIER = 2.0
    
    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }
    
    private fun getBackoffKey(originId: String, destinationId: String): String {
        return "${originId}_${destinationId}"
    }
    
    fun shouldAllowRequest(context: Context, originId: String, destinationId: String): Boolean {
        val prefs = getSharedPreferences(context)
        val key = getBackoffKey(originId, destinationId)
        
        val lastFailureTime = prefs.getLong("last_failure_$key", 0L)
        val failureCount = prefs.getInt("failure_count_$key", 0)
        
        if (failureCount == 0) {
            return true // No previous failures
        }
        
        val backoffTime = calculateBackoffTime(failureCount)
        val timeSinceLastFailure = System.currentTimeMillis() - lastFailureTime
        
        return timeSinceLastFailure >= backoffTime
    }
    
    fun recordFailure(context: Context, originId: String, destinationId: String) {
        val prefs = getSharedPreferences(context)
        val key = getBackoffKey(originId, destinationId)
        
        val currentFailureCount = prefs.getInt("failure_count_$key", 0)
        
        prefs.edit()
            .putLong("last_failure_$key", System.currentTimeMillis())
            .putInt("failure_count_$key", currentFailureCount + 1)
            .apply()
    }
    
    fun recordSuccess(context: Context, originId: String, destinationId: String) {
        val prefs = getSharedPreferences(context)
        val key = getBackoffKey(originId, destinationId)
        
        // Clear failure tracking on success
        prefs.edit()
            .remove("last_failure_$key")
            .remove("failure_count_$key")
            .apply()
    }
    
    fun getNextAllowedTime(context: Context, originId: String, destinationId: String): Long {
        val prefs = getSharedPreferences(context)
        val key = getBackoffKey(originId, destinationId)
        
        val lastFailureTime = prefs.getLong("last_failure_$key", 0L)
        val failureCount = prefs.getInt("failure_count_$key", 0)
        
        if (failureCount == 0) {
            return 0L // Can make request immediately
        }
        
        val backoffTime = calculateBackoffTime(failureCount)
        return lastFailureTime + backoffTime
    }
    
    private fun calculateBackoffTime(failureCount: Int): Long {
        val backoffMs = INITIAL_BACKOFF_MS * BACKOFF_MULTIPLIER.pow(failureCount - 1)
        return min(backoffMs.toLong(), MAX_BACKOFF_MS)
    }
}
