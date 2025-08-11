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
import android.util.Log
import android.util.SizeF
import android.os.Bundle

class TrainScheduleWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.ACTION_WIDGET_UPDATE"
        private const val TIME_FORMAT = "HH:mm"
    }
    
    private val apiService = RailApiService()
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d("WidgetProvider", "onUpdate called for ${appWidgetIds.size} widgets")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
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
                    Log.d("WidgetProvider", "Triggered update for widget $appWidgetId")
                    refreshWidget(context, appWidgetManager, appWidgetId)
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
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("WidgetProvider", "Widget provider disabled - clearing cache")
        WidgetCacheManager.clearAllCache(context)
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
            Log.d("WidgetProvider", "Force refreshing widget $appWidgetId")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = false)
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
            "${widgetData.originName} → ${widgetData.destinationName}" 
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
        // Show loading state immediately
        showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        
        // Try to use cached data first if requested
        if (useCache) {
            val cachedData = WidgetCacheManager.getCachedData(context, widgetData.originId, widgetData.destinationId)
            if (cachedData != null) {
                Log.d("WidgetProvider", "Using cached data for widget $appWidgetId")
                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
                return
            }
        }
        
        // Load fresh data from API
        Log.d("WidgetProvider", "Loading fresh data for widget $appWidgetId from API")
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId)
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d("WidgetProvider", "API success for widget $appWidgetId: ${scheduleData.routes.size} routes")
                        
                        // Cache the fresh data
                        WidgetCacheManager.cacheData(context, widgetData.originId, widgetData.destinationId, scheduleData)
                        
                        // Update UI on main thread
                        CoroutineScope(Dispatchers.Main).launch {
                            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e("WidgetProvider", "API error for widget $appWidgetId", error)
                        
                        // Update UI on main thread
                        CoroutineScope(Dispatchers.Main).launch {
                            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Failed to load trains")
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("WidgetProvider", "Exception for widget $appWidgetId", e)
                
                // Update UI on main thread
                CoroutineScope(Dispatchers.Main).launch {
                    showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Connection error")
                }
            }
        }
    }

    private fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d("WidgetProvider", "showScheduleData called for widget $appWidgetId with ${routes.size} routes")
        
        Log.d("WidgetProvider", "Android version: ${android.os.Build.VERSION.SDK_INT}, S=${android.os.Build.VERSION_CODES.S}")
        
        // For Android 12+ (API 31+), use responsive layouts
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            Log.d("WidgetProvider", "Using responsive layout for widget $appWidgetId")
            try {
                val responsiveViews = createResponsiveViews(context, appWidgetManager, appWidgetId, widgetData, routes)
                appWidgetManager.updateAppWidget(appWidgetId, responsiveViews)
                Log.d("WidgetProvider", "Successfully updated widget $appWidgetId with responsive views")
            } catch (e: Exception) {
                Log.e("WidgetProvider", "Error with responsive views, falling back to single view", e)
                // Fallback to single view if responsive fails
                val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, routes)
                setupClickIntents(context, views, appWidgetId, widgetData)
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        } else {
            Log.d("WidgetProvider", "Using legacy single view for widget $appWidgetId")
            // Fallback for older Android versions
            val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, routes)
            setupClickIntents(context, views, appWidgetId, widgetData)
            try {
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d("WidgetProvider", "Successfully updated widget $appWidgetId with single view (legacy)")
            } catch (e: Exception) {
                Log.e("WidgetProvider", "Error updating widget $appWidgetId with single view", e)
            }
        }
    }
    
    private fun createResponsiveViews(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>): RemoteViews {
        // Create different views for different sizes
        val smallView = createViewForSize(context, widgetData, routes, 1) // 1 row
        val mediumView = createViewForSize(context, widgetData, routes, 2) // 2 rows  
        val largeView = createViewForSize(context, widgetData, routes, 3) // 3 rows
        val xLargeView = createViewForSize(context, widgetData, routes, 4) // 4 rows
        val xxLargeView = createViewForSize(context, widgetData, routes, 5) // 5 rows
        val extraLargeView = createViewForSize(context, widgetData, routes, 6) // 6 rows
        
        // Setup click intents for all views
        setupClickIntents(context, smallView, appWidgetId, widgetData)
        setupClickIntents(context, mediumView, appWidgetId, widgetData)
        setupClickIntents(context, largeView, appWidgetId, widgetData)
        setupClickIntents(context, xLargeView, appWidgetId, widgetData)
        setupClickIntents(context, xxLargeView, appWidgetId, widgetData)
        setupClickIntents(context, extraLargeView, appWidgetId, widgetData)
        
        // Define size mappings (sizes in dp) - comprehensive coverage for all row counts
        val viewMapping: Map<SizeF, RemoteViews> = mapOf(
            SizeF(250f, 110f) to smallView,     // Minimum size - 1 row
            SizeF(320f, 160f) to mediumView,    // Medium size - 2 rows (4x width default)
            SizeF(320f, 210f) to largeView,     // Large size - 3 rows
            SizeF(320f, 280f) to xLargeView,    // X-Large size - 4 rows
            SizeF(320f, 350f) to xxLargeView,   // XX-Large size - 5 rows
            SizeF(320f, 420f) to extraLargeView // Extra large - 6 rows
        )
        
        Log.d("WidgetProvider", "Created responsive views with ${viewMapping.size} size variants for 1-6 rows")
        Log.d("WidgetProvider", "Size mappings: ${viewMapping.keys.joinToString { "${it.width}x${it.height}" }}")
        
        // Create responsive RemoteViews
        return RemoteViews(viewMapping)
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
            "${widgetData.originName} → ${widgetData.destinationName}" 
        })
        
        if (routes.isEmpty()) {
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
            
            // Use the larger of the two heights for better UX
            val effectiveHeight = maxOf(minHeight, maxHeight)
            
            Log.d("WidgetProvider", "Widget $appWidgetId size: minHeight=$minHeight, maxHeight=$maxHeight, effective=$effectiveHeight")
            
            // Calculate rows based on height (in dp)
            // Convert from pixels to dp
            val density = context.resources.displayMetrics.density
            val heightDp = (effectiveHeight / density).toInt()
            
            val maxRows = when {
                heightDp < 150 -> 1  // Very small widget
                heightDp < 200 -> 2  // Small widget  
                heightDp < 300 -> 3  // Medium widget
                heightDp < 400 -> 4  // Large widget
                heightDp < 500 -> 5  // Large widget
                else -> 6            // Extra large widget
            }
            
            Log.d("WidgetProvider", "Widget $appWidgetId: heightDp=$heightDp -> maxRows=$maxRows")
            maxRows
        } catch (e: Exception) {
            Log.e("WidgetProvider", "Error getting widget size, defaulting to 3 rows", e)
            3 // Default fallback
        }
    }
    
    private fun populateTrainCards(views: RemoteViews, routes: List<com.betterrail.widget.data.WidgetTrainItem>, maxRows: Int) {
        val trainItemIds = listOf(
            R.id.widget_train_item_1,
            R.id.widget_train_item_2,
            R.id.widget_train_item_3,
            R.id.widget_train_item_4,
            R.id.widget_train_item_5,
            R.id.widget_train_item_6
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
    
    private fun hideAllTrainCards(views: RemoteViews) {
        val trainItemIds = listOf(
            R.id.widget_train_item_1,
            R.id.widget_train_item_2,
            R.id.widget_train_item_3,
            R.id.widget_train_item_4,
            R.id.widget_train_item_5,
            R.id.widget_train_item_6
        )
        
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
    }

    private fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            "${widgetData.originName} → ${widgetData.destinationName}" 
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