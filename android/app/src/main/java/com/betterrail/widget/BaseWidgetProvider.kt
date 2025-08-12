package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.api.RailApiService
import com.betterrail.widget.api.fold
import com.betterrail.widget.cache.WidgetCacheManager
import com.betterrail.widget.utils.WidgetTrainFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar
import android.util.Log
import android.os.Bundle

abstract class BaseWidgetProvider : AppWidgetProvider() {

    protected val apiService = RailApiService()
    
    companion object {
        const val TIME_FORMAT = "HH:mm"
        val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    }

    abstract fun getActionRefresh(): String
    abstract fun getActionWidgetUpdate(): String
    abstract fun getLayoutResource(): Int
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d(getLogTag(), "onUpdate called for ${appWidgetIds.size} widgets (system-triggered)")
        for (appWidgetId in appWidgetIds) {
            val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
            
            if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
                Log.d(getLogTag(), "Widget $appWidgetId not configured, showing config state")
                showConfigurationState(context, appWidgetManager, appWidgetId)
            } else {
                Log.d(getLogTag(), "Widget $appWidgetId configured, loading data on system update")
                loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = true)
                WidgetAlarmManager.scheduleRegularUpdates(context)
            }
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }
    
    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        Log.d(getLogTag(), "onAppWidgetOptionsChanged for widget $appWidgetId")
        updateAppWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        Log.d(getLogTag(), "onReceive: ${intent.action}")
        when (intent.action) {
            getActionRefresh() -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, this::class.java)
                )
                Log.d(getLogTag(), "Manual refresh for ${appWidgetIds.size} widgets")
                for (appWidgetId in appWidgetIds) {
                    refreshWidget(context, appWidgetManager, appWidgetId)
                }
            }
            getActionWidgetUpdate() -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)
                if (appWidgetId != -1) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    val forceViewRefresh = intent.getBooleanExtra("force_view_refresh", false)
                    Log.d(getLogTag(), "Triggered update for widget $appWidgetId (forceViewRefresh=$forceViewRefresh)")
                    
                    if (forceViewRefresh) {
                        refreshWidgetView(context, appWidgetManager, appWidgetId)
                    } else {
                        forceRefreshWidgetInternal(context, appWidgetManager, appWidgetId)
                    }
                }
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        Log.d(getLogTag(), "onDeleted for widgets: ${appWidgetIds.joinToString()}")
        for (appWidgetId in appWidgetIds) {
            WidgetUpdateWorker.cancelWidgetUpdates(context, appWidgetId)
            WidgetPreferences.deleteWidgetData(context, appWidgetId)
            Log.d(getLogTag(), "Cleaned up widget $appWidgetId")
        }
        super.onDeleted(context, appWidgetIds)
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d(getLogTag(), "Widget provider enabled")
        WidgetAlarmManager.scheduleRegularUpdates(context)
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d(getLogTag(), "Widget provider disabled - clearing cache")
        WidgetCacheManager.clearAllCache(context)
        WidgetAlarmManager.cancelRegularUpdates(context)
    }

    protected fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "updateAppWidget called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.d(getLogTag(), "Widget $appWidgetId not configured yet")
            showConfigurationState(context, appWidgetManager, appWidgetId)
        } else {
            Log.d(getLogTag(), "Widget $appWidgetId configured: ${widgetData.originName} -> ${widgetData.destinationName}")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = true)
        }
    }
    
    protected fun refreshWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "refreshWidget called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d(getLogTag(), "Refreshing widget $appWidgetId view from cached data")
            refreshWidgetFromCache(context, appWidgetManager, appWidgetId, widgetData)
        }
    }

    private fun refreshWidgetFromCache(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val cachedData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
            ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
        
        if (cachedData != null) {
            Log.d(getLogTag(), "Using cached data for widget refresh $appWidgetId (${cachedData.routes.size} routes)")
            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
        } else {
            Log.w(getLogTag(), "No cached data available anywhere for route ${widgetData.originId}->${widgetData.destinationId}")
            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "No data available")
        }
    }

    private fun forceRefreshWidgetInternal(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "forceRefreshWidgetInternal called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d(getLogTag(), "Force API refresh for widget $appWidgetId")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = false)
        }
    }
    
    private fun refreshWidgetView(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "refreshWidgetView called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d(getLogTag(), "Refreshing widget view $appWidgetId with cached data")
            
            val cachedData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
            
            if (cachedData != null) {
                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
                recordDisplayTime(context, appWidgetId)
            } else {
                Log.w(getLogTag(), "No cached data available anywhere for route ${widgetData.originId}->${widgetData.destinationId}")
                showErrorState(context, appWidgetManager, appWidgetId, widgetData, "No data available")
            }
        }
    }

    protected fun loadWidgetData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, useCache: Boolean) {
        val cachedData = if (useCache) {
            WidgetCacheManager.getCachedDataWithWidgetId(context, appWidgetId, widgetData.originId, widgetData.destinationId, widgetData.updateFrequencyMinutes)
        } else {
            WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
        } ?: run {
            Log.d(getLogTag(), "No widget-specific cache found, checking for route-level cache for widget $appWidgetId")
            WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
        }
        
        if (cachedData != null) {
            Log.d(getLogTag(), "Using cached data for immediate display widget $appWidgetId")
            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
            
            if (useCache) {
                return
            }
        } else {
            showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        }
        
        if (!useCache || cachedData == null) {
            Log.d(getLogTag(), "Fetching fresh data for widget $appWidgetId from API (useCache=$useCache, hasCachedData=${cachedData != null})")
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId)
                    result.fold(
                        onSuccess = { scheduleData ->
                            Log.d(getLogTag(), "API success for widget $appWidgetId: ${scheduleData.routes.size} routes")
                            
                            WidgetCacheManager.cacheDataForWidget(context, appWidgetId, widgetData.originId, widgetData.destinationId, scheduleData)
                            
                            CoroutineScope(Dispatchers.Main).launch {
                                Log.d(getLogTag(), "Updating UI for widget $appWidgetId with fresh API data")
                                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                            }
                            
                            Log.d(getLogTag(), "API data cached and displayed successfully for widget $appWidgetId")
                        },
                        onFailure = { error ->
                            Log.e(getLogTag(), "API error for widget $appWidgetId", error)
                            
                            val fallbackData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                                ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
                            
                            CoroutineScope(Dispatchers.Main).launch {
                                if (fallbackData != null) {
                                    Log.d(getLogTag(), "Using fallback cached data for widget $appWidgetId")
                                    showScheduleData(context, appWidgetManager, appWidgetId, widgetData, fallbackData.routes)
                                } else {
                                    showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Failed to load")
                                }
                            }
                        }
                    )
                } catch (e: Exception) {
                    Log.e(getLogTag(), "Exception for widget $appWidgetId", e)
                    
                    val fallbackData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                        ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
                    
                    CoroutineScope(Dispatchers.Main).launch {
                        if (fallbackData != null) {
                            Log.d(getLogTag(), "Using fallback cached data after exception for widget $appWidgetId")
                            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, fallbackData.routes)
                        } else {
                            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Connection error")
                        }
                    }
                }
            }
        }
    }

    protected fun loadTomorrowsTrains(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "Loading tomorrow's trains for widget $appWidgetId")
        
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, 1)
        val tomorrowDate = DATE_FORMAT.format(calendar.time)
        
        Log.d(getLogTag(), "Fetching trains for tomorrow: $tomorrowDate")
        
        showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d(getLogTag(), "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate, hour=00:00")
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = "00:00")
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d(getLogTag(), "Tomorrow API success for widget $appWidgetId: ${scheduleData.routes.size} routes")
                        if (scheduleData.routes.isEmpty()) {
                            Log.w(getLogTag(), "Tomorrow API returned 0 routes for $tomorrowDate from ${widgetData.originId} to ${widgetData.destinationId}")
                        }
                        
                        Log.d(getLogTag(), "Tomorrow's API data cached for widget $appWidgetId")
                    },
                    onFailure = { error ->
                        Log.e(getLogTag(), "Tomorrow API error for widget $appWidgetId: ${error.message}", error)
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception getting tomorrow's trains for widget $appWidgetId", e)
                
                CoroutineScope(Dispatchers.Main).launch {
                    showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                }
            }
        }
    }

    private fun recordDisplayTime(context: Context, appWidgetId: Int) {
        val prefs = context.getSharedPreferences("widget_display_times", Context.MODE_PRIVATE)
        val currentTime = System.currentTimeMillis()
        
        prefs.edit()
            .putLong("widget_${appWidgetId}_display_time", currentTime)
            .apply()
            
        val timeFormat = SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        Log.d(getLogTag(), "Recorded display time for widget $appWidgetId: ${timeFormat.format(java.util.Date(currentTime))}")
    }

    // Abstract methods to be implemented by concrete providers
    abstract fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int)
    abstract fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData)
    abstract fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>)
    abstract fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String)
    abstract fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData)
    abstract fun configureWidget(context: Context, appWidgetId: Int)
    abstract fun scheduleWidgetUpdates(context: Context, appWidgetId: Int)
    abstract fun getLogTag(): String

    protected fun setupClickIntentsBase(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData, clickTargetId: Int) {
        if (widgetData.originId.isEmpty()) {
            // Subclasses will handle configuration intents
            return
        }
        
        // Set up tap-to-refresh for configured widgets
        val refreshIntent = Intent(context, this::class.java).apply {
            action = getActionWidgetUpdate()
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            putExtra("force_view_refresh", false)
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(clickTargetId, refreshPendingIntent)
    }
}