package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.betterrail.MainActivity
import com.betterrail.R
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.api.RailApiService
import com.betterrail.widget.api.fold
import com.betterrail.widget.cache.WidgetCacheManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar
import android.util.Log
import android.os.Bundle

class TrainScheduleWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.ACTION_WIDGET_UPDATE"
        private const val TIME_FORMAT = "HH:mm"
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    }
    
    private val apiService = RailApiService()
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d("WidgetProvider", "onUpdate called for ${appWidgetIds.size} widgets (system-triggered)")
        for (appWidgetId in appWidgetIds) {
            val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
            
            if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
                Log.d("WidgetProvider", "Widget $appWidgetId not configured, showing config state")
                showConfigurationState(context, appWidgetManager, appWidgetId)
            } else {
                Log.d("WidgetProvider", "Widget $appWidgetId configured, loading data on system update")
                // On system updates (app restart, reboot), try cached data first
                loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = true)
                // Ensure alarm system is running for configured widgets
                WidgetAlarmManager.scheduleRegularUpdates(context)
            }
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }
    
    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        Log.d("WidgetProvider", "onAppWidgetOptionsChanged for widget $appWidgetId")
        updateAppWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        Log.d("WidgetProvider", "onReceive: ${intent.action}")
        when (intent.action) {
            ACTION_REFRESH -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, TrainScheduleWidgetProvider::class.java)
                )
                Log.d("WidgetProvider", "Manual refresh for ${appWidgetIds.size} widgets")
                for (appWidgetId in appWidgetIds) {
                    refreshWidget(context, appWidgetManager, appWidgetId)
                }
            }
            ACTION_WIDGET_UPDATE -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)
                if (appWidgetId != -1) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    val forceViewRefresh = intent.getBooleanExtra("force_view_refresh", false)
                    Log.d("WidgetProvider", "Triggered update for widget $appWidgetId (forceViewRefresh=$forceViewRefresh)")
                    
                    if (forceViewRefresh) {
                        // Force refresh the view with cached data and update "Updated" time
                        refreshWidgetView(context, appWidgetManager, appWidgetId)
                    } else {
                        // Force API refresh to get fresh data - use internal method to avoid recursion
                        forceRefreshWidgetInternal(context, appWidgetManager, appWidgetId)
                    }
                }
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        Log.d("WidgetProvider", "onDeleted for widgets: ${appWidgetIds.joinToString()}")
        for (appWidgetId in appWidgetIds) {
            // Cancel scheduled updates
            WidgetUpdateWorker.cancelWidgetUpdates(context, appWidgetId)
            
            // Clean up widget preferences
            WidgetPreferences.deleteWidgetData(context, appWidgetId)
            
            Log.d("WidgetProvider", "Cleaned up widget $appWidgetId")
        }
        super.onDeleted(context, appWidgetIds)
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("WidgetProvider", "Widget provider enabled")
        // Start the AlarmManager for regular widget updates
        WidgetAlarmManager.scheduleRegularUpdates(context)
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("WidgetProvider", "Widget provider disabled - clearing cache")
        WidgetCacheManager.clearAllCache(context)
        // Stop the AlarmManager when no widgets are active
        WidgetAlarmManager.cancelRegularUpdates(context)
    }
    
    private fun recordDisplayTime(context: Context, appWidgetId: Int) {
        val prefs = context.getSharedPreferences("widget_display_times", Context.MODE_PRIVATE)
        val currentTime = System.currentTimeMillis()
        
        prefs.edit()
            .putLong("widget_${appWidgetId}_display_time", currentTime)
            .apply()
            
        val timeFormat = SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
        Log.d("WidgetProvider", "Recorded display time for widget $appWidgetId: ${timeFormat.format(java.util.Date(currentTime))}")
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("WidgetProvider", "updateAppWidget called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.d("WidgetProvider", "Widget $appWidgetId not configured yet")
            showConfigurationState(context, appWidgetManager, appWidgetId)
        } else {
            Log.d("WidgetProvider", "Widget $appWidgetId configured: ${widgetData.originName} -> ${widgetData.destinationName}")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = true)
        }
    }
    
    private fun refreshWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("WidgetProvider", "refreshWidget called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d("WidgetProvider", "Refreshing widget $appWidgetId view from cached data")
            refreshWidgetFromCache(context, appWidgetManager, appWidgetId, widgetData)
        }
    }

    private fun refreshWidgetFromCache(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        // Try to get cached data with comprehensive fallback
        val cachedData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
            ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
        
        if (cachedData != null) {
            Log.d("WidgetProvider", "Using cached data for widget refresh $appWidgetId (${cachedData.routes.size} routes)")
            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
        } else {
            Log.w("WidgetProvider", "No cached data available anywhere for route ${widgetData.originId}->${widgetData.destinationId}")
            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "No data available")
        }
    }

    private fun forceRefreshWidgetInternal(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("WidgetProvider", "forceRefreshWidgetInternal called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d("WidgetProvider", "Force API refresh for widget $appWidgetId")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = false)
        }
    }
    
    private fun refreshWidgetView(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("WidgetProvider", "refreshWidgetView called for widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d("WidgetProvider", "Refreshing widget view $appWidgetId with cached data")
            
            // Get cached data with comprehensive fallback
            val cachedData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
            
            if (cachedData != null) {
                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
                // Record the current display time since we're updating the view
                recordDisplayTime(context, appWidgetId)
            } else {
                Log.w("WidgetProvider", "No cached data available anywhere for route ${widgetData.originId}->${widgetData.destinationId}")
                showErrorState(context, appWidgetManager, appWidgetId, widgetData, "No data available")
            }
        }
    }

    private fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("WidgetProvider", "showConfigurationState called for widget $appWidgetId")
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, "Tap to configure")
        views.setTextViewText(R.id.widget_subtitle, "Select your route")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Successfully showed configuration state for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error showing configuration state for widget $appWidgetId", e)
        }
    }

    private fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        views.setTextViewText(R.id.widget_subtitle, "Loading schedule...")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Successfully showed loading state for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error showing loading state for widget $appWidgetId", e)
        }
    }

    private fun loadWidgetData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, useCache: Boolean) {
        // Always try cached data first for faster display
        val cachedData = if (useCache) {
            WidgetCacheManager.getCachedDataWithWidgetId(context, appWidgetId, widgetData.originId, widgetData.destinationId, widgetData.updateFrequencyMinutes)
        } else {
            // Even for force refresh, check if we have any cached data for immediate display
            WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
        } ?: run {
            // If no widget-specific cache, try to find any cached data for this route
            Log.d("WidgetProvider", "No widget-specific cache found, checking for route-level cache for widget $appWidgetId")
            WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
        }
        
        if (cachedData != null) {
            Log.d("WidgetProvider", "Using cached data for immediate display widget $appWidgetId")
            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
            
            // If we found valid cached data and useCache is true, we're done
            if (useCache) {
                return
            }
            // Otherwise continue to fetch fresh data in background
        } else {
            // No cached data available, show loading state
            showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        }
        
        // Only fetch fresh data when explicitly requested (!useCache) or no cache exists
        if (!useCache || cachedData == null) {
            Log.d("WidgetProvider", "Fetching fresh data for widget $appWidgetId from API (useCache=$useCache, hasCachedData=${cachedData != null})")
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId)
                    result.fold(
                        onSuccess = { scheduleData ->
                            Log.d("WidgetProvider", "API success for widget $appWidgetId: ${scheduleData.routes.size} routes")
                            
                            // Cache the fresh data using widget-specific key
                            WidgetCacheManager.cacheDataForWidget(context, appWidgetId, widgetData.originId, widgetData.destinationId, scheduleData)
                            
                            // Update UI on main thread
                            CoroutineScope(Dispatchers.Main).launch {
                                Log.d("WidgetProvider", "Updating UI for widget $appWidgetId with fresh API data")
                                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                            }
                            
                            Log.d("WidgetProvider", "API data cached and displayed successfully for widget $appWidgetId")
                        },
                        onFailure = { error ->
                            Log.e("WidgetProvider", "API error for widget $appWidgetId", error)
                            
                            // Try cached data as fallback (ignoring expiration)
                            val fallbackData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                                ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
                            
                            // Update UI on main thread
                            CoroutineScope(Dispatchers.Main).launch {
                                if (fallbackData != null) {
                                    Log.d("WidgetProvider", "Using fallback cached data for widget $appWidgetId")
                                    showScheduleData(context, appWidgetManager, appWidgetId, widgetData, fallbackData.routes)
                                } else {
                                    showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Failed to load")
                                }
                            }
                        }
                    )
                } catch (e: Exception) {
                    Log.e("WidgetProvider", "Exception for widget $appWidgetId", e)
                    
                    // Try cached data as fallback (ignoring expiration)
                    val fallbackData = WidgetCacheManager.getCachedDataIgnoreAge(context, appWidgetId, widgetData.originId, widgetData.destinationId)
                        ?: WidgetCacheManager.getMostRecentCachedDataForRoute(context, widgetData.originId, widgetData.destinationId)
                    
                    // Update UI on main thread
                    CoroutineScope(Dispatchers.Main).launch {
                        if (fallbackData != null) {
                            Log.d("WidgetProvider", "Using fallback cached data after exception for widget $appWidgetId")
                            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, fallbackData.routes)
                        } else {
                            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Connection error")
                        }
                    }
                }
            }
        }
    }

    private fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d("WidgetProvider", "showScheduleData called for widget $appWidgetId with ${routes.size} routes")
        
        if (routes.isEmpty()) {
            // No trains today, try to get tomorrow's trains
            loadTomorrowsTrains(context, appWidgetManager, appWidgetId, widgetData)
            return
        }
        
        // Always use single view approach for predictable behavior
        Log.d("WidgetProvider", "Using single view approach for reliable widget sizing")
        val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, routes)
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Successfully updated widget $appWidgetId with single view")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error updating widget $appWidgetId with single view", e)
        }
    }
    
    
    private fun createSingleView(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>): RemoteViews {
        // Get current widget size and determine max rows
        val maxRows = getMaxRowsForWidgetSize(context, appWidgetManager, appWidgetId)
        return createViewForSize(context, widgetData, routes, maxRows)
    }
    
    private fun createViewForSize(context: Context, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>, maxRows: Int): RemoteViews {
        Log.d("WidgetProvider", "Creating view for $maxRows rows with ${routes.size} available routes")
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        
        if (routes.isEmpty()) {
            // This should not happen since we handle empty routes at a higher level now
            val currentTime = SimpleDateFormat(TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "No trains found")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            hideAllTrainCards(views)
        } else {
            val currentTime = SimpleDateFormat(TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "Next departures ($maxRows trains)")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_train_list, android.view.View.VISIBLE)
            
            // Populate train items based on size
            populateTrainCards(views, routes, maxRows)
            
            Log.d("WidgetProvider", "Created view for size with $maxRows rows from ${routes.size} available routes")
        }
        
        return views
    }
    
    private fun getMaxRowsForWidgetSize(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int): Int {
        return try {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
            val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110)
            
            // Always use the maximum height available for best UX
            val effectiveHeight = maxHeight
            
            Log.d("WidgetProvider", "Widget $appWidgetId size: minHeight=$minHeight, maxHeight=$maxHeight, using=$effectiveHeight")
            
            // Conservative calculation to ensure no cutoff - based on actual widget measurements
            val headerHeight = 75  // Title + subtitle + spacing (slightly reduced)
            val widgetPadding = 28 // Widget container padding (slightly reduced)
            val bottomMargin = 12  // Bottom margin for safety (reduced)
            val overhead = headerHeight + widgetPadding + bottomMargin
            val availableHeight = effectiveHeight - overhead
            val itemHeight = 48 // Each train item with proper spacing (slightly reduced)
            
            val calculatedRows = if (availableHeight < itemHeight) 1 else (availableHeight / itemHeight).toInt()
            
            // Conservative approach - only show what definitely fits, but allow one more if calculated
            val maxRows = when {
                calculatedRows >= 10 -> 10  // Only show 10 if we're very sure
                calculatedRows >= 9 -> minOf(calculatedRows, 10)  // Allow 9-10 rows if calculated
                calculatedRows >= 7 -> minOf(calculatedRows, 8)   // Allow 7-8 rows if calculated
                calculatedRows >= 5 -> minOf(calculatedRows, 6)   // Allow 5-6 rows if calculated
                calculatedRows >= 3 -> minOf(calculatedRows, 4)   // Allow 3-4 rows if calculated
                else -> minOf(calculatedRows, 2) // Conservative fallback
            }
            
            Log.d("WidgetProvider", "Widget $appWidgetId: effectiveHeight=$effectiveHeight, availableHeight=$availableHeight, calculatedRows=$calculatedRows -> maxRows=$maxRows")
            maxRows
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error getting widget size, defaulting to 3 rows", e)
            3 // Conservative default
        }
    }
    
    private fun populateTrainCards(views: RemoteViews, routes: List<com.betterrail.widget.data.WidgetTrainItem>, maxRows: Int) {
        val trainItemIds = listOf(
            R.id.widget_train_item_1,
            R.id.widget_train_item_2,
            R.id.widget_train_item_3,
            R.id.widget_train_item_4,
            R.id.widget_train_item_5,
            R.id.widget_train_item_6,
            R.id.widget_train_item_7,
            R.id.widget_train_item_8,
            R.id.widget_train_item_9,
            R.id.widget_train_item_10
        )
        
        Log.d("WidgetProvider", "populateTrainCards: maxRows=$maxRows, trainItemIds.size=${trainItemIds.size}, routes.size=${routes.size}")
        val limitedRoutes = routes.take(minOf(maxRows, trainItemIds.size))
        Log.d("WidgetProvider", "populateTrainCards: will show ${limitedRoutes.size} train cards")
        
        // Hide all train cards first
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
        
        // Show and populate cards for available routes
        limitedRoutes.forEachIndexed { index, route ->
            val itemId = trainItemIds[index]
            Log.d("WidgetProvider", "Showing train card $index: itemId=$itemId, departureTime=${route.departureTime}")
            views.setViewVisibility(itemId, android.view.View.VISIBLE)
            
            // Set departure time
            val departureTimeId = when (index) {
                0 -> R.id.train_departure_time_1
                1 -> R.id.train_departure_time_2
                2 -> R.id.train_departure_time_3
                3 -> R.id.train_departure_time_4
                4 -> R.id.train_departure_time_5
                5 -> R.id.train_departure_time_6
                6 -> R.id.train_departure_time_7
                7 -> R.id.train_departure_time_8
                8 -> R.id.train_departure_time_9
                9 -> R.id.train_departure_time_10
                else -> R.id.train_departure_time_1
            }
            views.setTextViewText(departureTimeId, route.departureTime)
            
            // Set arrival time
            val arrivalTimeId = when (index) {
                0 -> R.id.train_arrival_time_1
                1 -> R.id.train_arrival_time_2
                2 -> R.id.train_arrival_time_3
                3 -> R.id.train_arrival_time_4
                4 -> R.id.train_arrival_time_5
                5 -> R.id.train_arrival_time_6
                6 -> R.id.train_arrival_time_7
                7 -> R.id.train_arrival_time_8
                8 -> R.id.train_arrival_time_9
                9 -> R.id.train_arrival_time_10
                else -> R.id.train_arrival_time_1
            }
            val arrivalText = if (route.arrivalTime.isNotEmpty()) {
                "arrives ${route.arrivalTime}"
            } else {
                "arrival time TBD"
            }
            views.setTextViewText(arrivalTimeId, arrivalText)
            
            // Set platform
            val platformText = if (route.platform.isNotEmpty()) {
                "Plat. ${route.platform}"
            } else {
                "Plat. TBD"
            }
            val platformId = when (index) {
                0 -> R.id.train_platform_1
                1 -> R.id.train_platform_2
                2 -> R.id.train_platform_3
                3 -> R.id.train_platform_4
                4 -> R.id.train_platform_5
                5 -> R.id.train_platform_6
                6 -> R.id.train_platform_7
                7 -> R.id.train_platform_8
                8 -> R.id.train_platform_9
                9 -> R.id.train_platform_10
                else -> R.id.train_platform_1
            }
            views.setTextViewText(platformId, platformText)
            
            // Set delay with proper color in separate TextView, positioned inline
            val delayId = when (index) {
                0 -> R.id.train_delay_1
                1 -> R.id.train_delay_2
                2 -> R.id.train_delay_3
                3 -> R.id.train_delay_4
                4 -> R.id.train_delay_5
                5 -> R.id.train_delay_6
                6 -> R.id.train_delay_7
                7 -> R.id.train_delay_8
                8 -> R.id.train_delay_9
                9 -> R.id.train_delay_10
                else -> R.id.train_delay_1
            }
            if (route.delay > 0) {
                views.setTextViewText(delayId, "+${route.delay}m")
                views.setViewVisibility(delayId, android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(delayId, android.view.View.GONE)
            }
        }
    }

    private fun loadTomorrowsTrains(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d("WidgetProvider", "Loading tomorrow's trains for widget $appWidgetId")
        
        // Calculate tomorrow's date
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, 1)
        val tomorrowDate = DATE_FORMAT.format(calendar.time)
        
        Log.d("WidgetProvider", "Fetching trains for tomorrow: $tomorrowDate")
        
        // Show loading state while we fetch tomorrow's data
        showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        
        // Make API call for tomorrow's trains
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d("WidgetProvider", "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate, hour=00:00")
                // Use 00:00 to get all trains from the beginning of the day
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = "00:00")
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d("WidgetProvider", "Tomorrow API success for widget $appWidgetId: ${scheduleData.routes.size} routes")
                        if (scheduleData.routes.isEmpty()) {
                            Log.w("WidgetProvider", "Tomorrow API returned 0 routes for $tomorrowDate from ${widgetData.originId} to ${widgetData.destinationId}")
                        }
                        
                        // Cache tomorrow's data but don't refresh UI
                        // The AlarmManager will handle view updates
                        Log.d("WidgetProvider", "Tomorrow's API data cached for widget $appWidgetId")
                    },
                    onFailure = { error ->
                        Log.e("WidgetProvider", "Tomorrow API error for widget $appWidgetId: ${error.message}", error)
                        
                        // Update UI on main thread with fallback
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("WidgetProvider", "Exception getting tomorrow's trains for widget $appWidgetId", e)
                
                // Update UI on main thread with fallback
                CoroutineScope(Dispatchers.Main).launch {
                    showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                }
            }
        }
    }

    private fun showTomorrowsScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d("WidgetProvider", "showTomorrowsScheduleData called for widget $appWidgetId with ${routes.size} routes")
        
        // Use the same single view approach but with tomorrow's data
        val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, routes)
        
        // Override the subtitle to indicate these are tomorrow's trains
        if (routes.isNotEmpty()) {
            val maxRows = getMaxRowsForWidgetSize(context, appWidgetManager, appWidgetId)
            val displayCount = minOf(routes.size, maxRows)
            views.setTextViewText(R.id.widget_subtitle, "Tomorrow's trains ($displayCount of ${routes.size} trains)")
            Log.d("WidgetProvider", "Set tomorrow's train data for widget $appWidgetId: ${widgetData.originName} -> ${widgetData.destinationName}, showing $displayCount of ${routes.size} trains")
        } else {
            views.setTextViewText(R.id.widget_subtitle, "No trains tomorrow")
        }
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Successfully updated widget $appWidgetId with tomorrow's data")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error updating widget $appWidgetId with tomorrow's data", e)
        }
    }

    private fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d("WidgetProvider", "showTomorrowsFallback called for widget $appWidgetId")
        
        // Use the same single view approach with empty routes to show "no trains" state
        val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, emptyList())
        
        // Override the subtitle to indicate this is about tomorrow
        views.setTextViewText(R.id.widget_subtitle, "No trains scheduled for route")
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Showed fallback tomorrow data for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error showing fallback tomorrow data for widget $appWidgetId", e)
        }
    }
    
    private fun hideAllTrainCards(views: RemoteViews) {
        val trainItemIds = listOf(
            R.id.widget_train_item_1,
            R.id.widget_train_item_2,
            R.id.widget_train_item_3,
            R.id.widget_train_item_4,
            R.id.widget_train_item_5,
            R.id.widget_train_item_6,
            R.id.widget_train_item_7,
            R.id.widget_train_item_8,
            R.id.widget_train_item_9,
            R.id.widget_train_item_10
        )
        
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
    }

    private fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        val currentTime = SimpleDateFormat(TIME_FORMAT, Locale.getDefault()).format(Date())
        views.setTextViewText(R.id.widget_subtitle, errorMessage)
        views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.VISIBLE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("WidgetProvider", "Successfully showed error state for widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error showing error state for widget $appWidgetId", e)
        }
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        // Set up refresh button
        val refreshIntent = Intent(context, TrainScheduleWidgetProvider::class.java)
        refreshIntent.action = ACTION_REFRESH
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent)
        
        // Set up tap-to-refresh for the entire widget (hard refresh with API call)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            val widgetRefreshIntent = Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                action = ACTION_WIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                putExtra("force_view_refresh", false) // Trigger API call for hard refresh
            }
            val widgetRefreshPendingIntent = PendingIntent.getBroadcast(
                context, appWidgetId + 1000, widgetRefreshIntent, // Use different request code to avoid conflicts
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_train_list, widgetRefreshPendingIntent)
        }
    }

    // Public method for configuration activity
    fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d("WidgetProvider", "Widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    // Call this method after widget configuration is complete
    fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d("WidgetProvider", "Scheduled updates for widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }
}

// Data class for train schedule items
data class TrainScheduleItem(
    val departureTime: String,
    val arrivalTime: String,
    val platform: String,
    val delay: Int = 0,
    val duration: String = "",
    val changesText: String = ""
)