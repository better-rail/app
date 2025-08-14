package com.betterrail.widget.repository

import android.content.Context
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.catch
import com.betterrail.widget.api.RailApiService
import com.betterrail.widget.repository.ModernCacheRepository
import com.betterrail.widget.data.WidgetScheduleData
import com.betterrail.widget.data.WidgetData
import android.util.Log
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository pattern implementation for train schedule data
 * Provides a clean abstraction layer between UI and data sources
 */
@Singleton
class TrainScheduleRepository @Inject constructor(
    private val apiService: RailApiService,
    private val cacheRepository: ModernCacheRepository
) {
    companion object {
        private const val TAG = "TrainScheduleRepository"
    }

    /**
     * Get train schedule with caching strategy
     * Returns cached data immediately, then fetches fresh data
     */
    fun getSchedule(
        widgetId: Int,
        widgetData: WidgetData,
        date: String? = null,
        hour: String? = null
    ): Flow<Resource<WidgetScheduleData>> = flow {
        Log.d(TAG, "Getting schedule for widget $widgetId: ${widgetData.originId} -> ${widgetData.destinationId}")
        
        // Emit cached data first (if available)
        val cachedData = cacheRepository.getCachedSchedule(widgetId, widgetData.originId, widgetData.destinationId, date)
        if (cachedData != null) {
            Log.d(TAG, "Emitting cached data for widget $widgetId")
            emit(Resource.Success(cachedData, fromCache = true))
        } else {
            Log.d(TAG, "No cached data for widget $widgetId, emitting loading state")
            emit(Resource.Loading())
        }
        
        // Then fetch fresh data from API
        try {
            Log.d(TAG, "Fetching fresh data from API for widget $widgetId")
            val result = apiService.getRoutes(
                originId = widgetData.originId,
                destinationId = widgetData.destinationId,
                date = date,
                hour = hour
            )
            
            result.fold(
                onSuccess = { scheduleData ->
                    Log.d(TAG, "Successfully fetched ${scheduleData.routes.size} routes for widget $widgetId")
                    
                    // Cache the fresh data
                    cacheRepository.cacheSchedule(widgetId, widgetData.originId, widgetData.destinationId, scheduleData, date, hour)
                    
                    // Emit fresh data
                    emit(Resource.Success(scheduleData, fromCache = false))
                },
                onFailure = { error ->
                    Log.e(TAG, "Failed to fetch schedule for widget $widgetId", error)
                    
                    // If we have cached data, don't emit error (already emitted cached data)
                    if (cachedData == null) {
                        emit(Resource.Error(error.message ?: "Unknown error"))
                    } else {
                        Log.d(TAG, "API failed but cached data available for widget $widgetId")
                    }
                }
            )
        } catch (e: Exception) {
            Log.e(TAG, "Exception while fetching schedule for widget $widgetId", e)
            if (cachedData == null) {
                emit(Resource.Error(e.message ?: "Unknown error"))
            }
        }
    }.catch { error ->
        Log.e(TAG, "Flow error for widget $widgetId", error)
        emit(Resource.Error(error.message ?: "Unknown error"))
    }

    /**
     * Get tomorrow's train schedule
     */
    fun getTomorrowSchedule(
        widgetId: Int,
        widgetData: WidgetData
    ): Flow<Resource<WidgetScheduleData>> {
        val tomorrow = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault())
            .format(java.util.Date(System.currentTimeMillis() + 24 * 60 * 60 * 1000))
        
        return getSchedule(widgetId, widgetData, date = tomorrow, hour = "05:00")
    }

    /**
     * Clear cache for specific widget
     */
    suspend fun clearCache(widgetId: Int) {
        Log.d(TAG, "Clearing cache for widget $widgetId")
        cacheRepository.clearWidgetCache(widgetId)
    }

    /**
     * Clear all cached data
     */
    suspend fun clearAllCache() {
        Log.d(TAG, "Clearing all cached data")
        cacheRepository.clearAllCache()
    }
}

/**
 * Resource wrapper for data loading states
 */
sealed class Resource<out T> {
    data class Success<T>(val data: T, val fromCache: Boolean = false) : Resource<T>()
    data class Error(val message: String) : Resource<Nothing>()
    class Loading : Resource<Nothing>()
    
    val isSuccess: Boolean get() = this is Success
    val isError: Boolean get() = this is Error
    val isLoading: Boolean get() = this is Loading
}

/**
 * Extension function for easier resource handling
 */
inline fun <T> Resource<T>.onSuccess(action: (T, Boolean) -> Unit): Resource<T> {
    if (this is Resource.Success) {
        action(data, fromCache)
    }
    return this
}

inline fun <T> Resource<T>.onError(action: (String) -> Unit): Resource<T> {
    if (this is Resource.Error) {
        action(message)
    }
    return this
}

inline fun <T> Resource<T>.onLoading(action: () -> Unit): Resource<T> {
    if (this is Resource.Loading) {
        action()
    }
    return this
}