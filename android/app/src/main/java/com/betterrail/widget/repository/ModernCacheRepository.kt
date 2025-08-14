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
            val expiryCutoff = System.currentTimeMillis() - (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
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
            val expiryCutoff = System.currentTimeMillis() - (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
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

    private fun isCacheValid(entity: TrainScheduleEntity): Boolean {
        val expiryTime = entity.cacheTimestamp + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000)
        return System.currentTimeMillis() < expiryTime
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