package com.betterrail.widget.repository

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import com.betterrail.widget.database.WidgetDatabase
import com.betterrail.widget.database.dao.TrainScheduleDao
import com.betterrail.widget.database.entities.TrainScheduleEntity
import com.betterrail.widget.data.WidgetScheduleData
import com.betterrail.widget.data.WidgetTrainItem
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar

/**
 * Modern cache repository using Room database
 * Provides intelligent caching with automatic cleanup and cache strategies
 */
@Singleton
class ModernCacheRepository @Inject constructor(
    @ApplicationContext private val context: Context,
    private val database: WidgetDatabase
) {
    private val trainScheduleDao: TrainScheduleDao = database.trainScheduleDao()
    
    companion object {
        private const val TAG = "ModernCacheRepository"
        private const val CACHE_EXPIRY_HOURS = 2 // Cache expires after 2 hours
        private const val MAX_CACHE_ENTRIES_PER_WIDGET = 5 // Keep max 5 entries per widget
        private const val MAX_TOTAL_CACHE_ENTRIES = 100 // Global cache limit
        private const val HOURS_TO_MILLISECONDS = 60 * 60 * 1000L
        
        private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        
        fun generateCacheKey(widgetId: Int, originId: String, destinationId: String, date: String? = null): String {
            val dateStr = date ?: dateFormat.format(Date())
            return "${widgetId}_${originId}_${destinationId}_${dateStr}"
        }
    }

    /**
     * Get cached schedule data
     */
    suspend fun getCachedSchedule(widgetId: Int, originId: String, destinationId: String, date: String? = null): WidgetScheduleData? {
        return try {
            val cacheKey = generateCacheKey(widgetId, originId, destinationId, date)
            val entity = trainScheduleDao.getSchedule(cacheKey)
            
            if (entity != null && isCacheValid(entity)) {
                Log.d(TAG, "Cache hit for key: $cacheKey (${entity.routes.size} routes)")
                WidgetScheduleData(
                    routes = entity.routes,
                    originName = entity.originName,
                    destinationName = entity.destinationName
                )
            } else {
                if (entity != null) {
                    Log.d(TAG, "Cache expired for key: $cacheKey")
                    // Clean up expired cache
                    trainScheduleDao.deleteSchedule(cacheKey)
                } else {
                    Log.d(TAG, "Cache miss for key: $cacheKey")
                }
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting cached schedule", e)
            null
        }
    }

    /**
     * Get cached schedule data as Flow for reactive updates
     */
    fun getCachedScheduleFlow(widgetId: Int, originId: String, destinationId: String, date: String? = null): Flow<WidgetScheduleData?> {
        val cacheKey = generateCacheKey(widgetId, originId, destinationId, date)
        return trainScheduleDao.getScheduleFlow(cacheKey).map { entity ->
            if (entity != null && isCacheValid(entity)) {
                WidgetScheduleData(
                    routes = entity.routes,
                    originName = entity.originName,
                    destinationName = entity.destinationName
                )
            } else {
                null
            }
        }
    }

    /**
     * Cache schedule data
     */
    suspend fun cacheSchedule(
        widgetId: Int,
        originId: String,
        destinationId: String,
        scheduleData: WidgetScheduleData,
        date: String? = null,
        hour: String? = null
    ) {
        try {
            val cacheKey = generateCacheKey(widgetId, originId, destinationId, date)
            val entity = TrainScheduleEntity(
                cacheKey = cacheKey,
                widgetId = widgetId,
                originId = originId,
                destinationId = destinationId,
                originName = scheduleData.originName,
                destinationName = scheduleData.destinationName,
                routes = scheduleData.routes,
                cacheTimestamp = System.currentTimeMillis(),
                requestDate = date,
                requestHour = hour
            )
            
            trainScheduleDao.insertSchedule(entity)
            Log.d(TAG, "Cached schedule for key: $cacheKey (${scheduleData.routes.size} routes)")
            
            // Trigger cache cleanup
            performCacheCleanup(widgetId)
        } catch (e: Exception) {
            Log.e(TAG, "Error caching schedule", e)
        }
    }

    /**
     * Get most recent cached data for a route (fallback when specific cache misses)
     */
    suspend fun getMostRecentScheduleForRoute(originId: String, destinationId: String): WidgetScheduleData? {
        return try {
            val entity = trainScheduleDao.getLatestScheduleForRoute(originId, destinationId)
            if (entity != null) {
                Log.d(TAG, "Using fallback cache for route: $originId -> $destinationId")
                WidgetScheduleData(
                    routes = entity.routes,
                    originName = entity.originName,
                    destinationName = entity.destinationName
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting recent schedule for route", e)
            null
        }
    }

    /**
     * Get most recent cached data for a widget (fallback)
     */
    suspend fun getMostRecentScheduleForWidget(widgetId: Int): WidgetScheduleData? {
        return try {
            val entity = trainScheduleDao.getLatestScheduleForWidget(widgetId)
            if (entity != null) {
                Log.d(TAG, "Using fallback cache for widget: $widgetId")
                WidgetScheduleData(
                    routes = entity.routes,
                    originName = entity.originName,
                    destinationName = entity.destinationName
                )
            } else {
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error getting recent schedule for widget", e)
            null
        }
    }

    /**
     * Clear cache for specific widget
     */
    suspend fun clearWidgetCache(widgetId: Int) {
        try {
            trainScheduleDao.deleteSchedulesForWidget(widgetId)
            Log.d(TAG, "Cleared cache for widget: $widgetId")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing widget cache", e)
        }
    }

    /**
     * Clear all cached data
     */
    suspend fun clearAllCache() {
        try {
            trainScheduleDao.deleteAllSchedules()
            Log.d(TAG, "Cleared all cache data")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing all cache", e)
        }
    }

    /**
     * Perform cache cleanup and maintenance
     */
    suspend fun performCacheCleanup(widgetId: Int? = null) {
        try {
            // Clean up expired entries
            val expiryCutoff = System.currentTimeMillis() - (CACHE_EXPIRY_HOURS * HOURS_TO_MILLISECONDS)
            trainScheduleDao.deleteOldSchedules(expiryCutoff)
            
            // If specific widget, clean up excess entries for that widget
            if (widgetId != null) {
                val widgetSchedules = trainScheduleDao.getAllSchedulesForWidget(widgetId)
                if (widgetSchedules.size > MAX_CACHE_ENTRIES_PER_WIDGET) {
                    val toDelete = widgetSchedules.sortedBy { it.cacheTimestamp }
                        .take(widgetSchedules.size - MAX_CACHE_ENTRIES_PER_WIDGET)
                    toDelete.forEach { trainScheduleDao.deleteSchedule(it) }
                    Log.d(TAG, "Cleaned up ${toDelete.size} excess entries for widget $widgetId")
                }
            }
            
            // Global cache size limit
            val totalCount = trainScheduleDao.getScheduleCount()
            if (totalCount > MAX_TOTAL_CACHE_ENTRIES) {
                val excessCount = totalCount - MAX_TOTAL_CACHE_ENTRIES
                val oldestEntries = trainScheduleDao.getOldestSchedules(excessCount)
                oldestEntries.forEach { trainScheduleDao.deleteSchedule(it) }
                Log.d(TAG, "Cleaned up $excessCount oldest cache entries")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error during cache cleanup", e)
        }
    }

    /**
     * Get cache statistics
     */
    suspend fun getCacheStats(): CacheStats {
        return try {
            val totalEntries = trainScheduleDao.getScheduleCount()
            val cachedWidgets = trainScheduleDao.getAllCachedWidgetIds()
            val expiryCutoff = System.currentTimeMillis() - (CACHE_EXPIRY_HOURS * HOURS_TO_MILLISECONDS)
            val expiredKeys = trainScheduleDao.getExpiredCacheKeys(expiryCutoff)
            
            CacheStats(
                totalEntries = totalEntries,
                cachedWidgetCount = cachedWidgets.size,
                expiredEntries = expiredKeys.size
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error getting cache stats", e)
            CacheStats(0, 0, 0)
        }
    }

    /**
     * Smart cache validation - checks both time expiry AND content relevance
     * Cache is invalid if:
     * 1. It's older than CACHE_EXPIRY_HOURS, OR
     * 2. All trains in the cache have already departed
     */
    private fun isCacheValid(entity: TrainScheduleEntity): Boolean {
        // Check time-based expiry (keep existing 2-hour limit as max)
        val expiryTime = entity.cacheTimestamp + (CACHE_EXPIRY_HOURS * HOURS_TO_MILLISECONDS)
        val isWithinTimeLimit = System.currentTimeMillis() < expiryTime
        
        // Check if any trains are still in the future
        val hasActiveFutureTrains = entity.routes.any { train ->
            isTrainInFuture(train.departureTime)
        }
        
        val isValid = isWithinTimeLimit && hasActiveFutureTrains
        
        if (!isValid) {
            val reason = when {
                !isWithinTimeLimit -> "time expired"
                !hasActiveFutureTrains -> "all trains departed"
                else -> "unknown"
            }
            Log.d(TAG, "Cache invalid for ${entity.cacheKey}: $reason")
        }
        
        return isValid
    }
    
    /**
     * Check if a train departure time is in the future
     * Uses same logic as WidgetTrainFilter for consistency
     */
    private fun isTrainInFuture(departureTime: String): Boolean {
        return try {
            val currentTime = Calendar.getInstance()
            val currentHour = currentTime.get(Calendar.HOUR_OF_DAY)
            val currentMinute = currentTime.get(Calendar.MINUTE)
            val currentTimeInMinutes = currentHour * 60 + currentMinute
            
            // Parse the departure time (format: "HH:mm")
            val timeParts = departureTime.split(":")
            if (timeParts.size == 2) {
                val trainHour = timeParts[0].toInt()
                val trainMinute = timeParts[1].toInt()
                val trainTimeInMinutes = trainHour * 60 + trainMinute
                
                trainTimeInMinutes >= currentTimeInMinutes
            } else {
                Log.w(TAG, "Invalid time format for train: $departureTime")
                true // Keep train if we can't parse time
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking if train is in future: $departureTime", e)
            true // Keep train if error occurs
        }
    }
}

/**
 * Cache statistics data class
 */
data class CacheStats(
    val totalEntries: Int,
    val cachedWidgetCount: Int,
    val expiredEntries: Int
)