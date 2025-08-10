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
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, "Tap to configure")
        views.setTextViewText(R.id.widget_subtitle, "Select your route")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        Log.d("WidgetProvider", "Showing configuration state for widget $appWidgetId")
    }

    private fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            "${widgetData.originName} → ${widgetData.destinationName}" 
        })
        views.setTextViewText(R.id.widget_subtitle, "Loading schedule...")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        Log.d("WidgetProvider", "Showing loading state for widget $appWidgetId")
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
        val views = RemoteViews(context.packageName, R.layout.widget_train_schedule)
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            "${widgetData.originName} → ${widgetData.destinationName}" 
        })
        
        if (routes.isEmpty()) {
            val currentTime = SimpleDateFormat(TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "No trains found")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            hideAllTrainCards(views)
            
            Log.d("WidgetProvider", "No routes found for widget $appWidgetId")
        } else {
            val currentTime = SimpleDateFormat(TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "Next departures")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_train_list, android.view.View.VISIBLE)
            
            // Populate CardView train items
            populateTrainCards(views, routes, widgetData.maxRows)
            
            Log.d("WidgetProvider", "Showing ${routes.size} routes for widget $appWidgetId as CardViews")
        }
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        Log.d("WidgetProvider", "Updated widget $appWidgetId with schedule data")
    }
    
    private fun populateTrainCards(views: RemoteViews, routes: List<com.betterrail.widget.data.WidgetTrainItem>, maxRows: Int) {
        val trainItemIds = listOf(
            R.id.widget_train_item_1,
            R.id.widget_train_item_2,
            R.id.widget_train_item_3,
            R.id.widget_train_item_4,
            R.id.widget_train_item_5
        )
        
        val limitedRoutes = routes.take(minOf(maxRows, trainItemIds.size))
        
        // Hide all train cards first
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
        
        // Show and populate cards for available routes
        limitedRoutes.forEachIndexed { index, route ->
            val itemId = trainItemIds[index]
            views.setViewVisibility(itemId, android.view.View.VISIBLE)
            
            // Set train time
            val timeDisplay = if (route.arrivalTime.isNotEmpty()) {
                "${route.departureTime} - ${route.arrivalTime}"
            } else {
                route.departureTime
            }
            val timeId = when (index) {
                0 -> R.id.train_time_1
                1 -> R.id.train_time_2
                2 -> R.id.train_time_3
                3 -> R.id.train_time_4
                4 -> R.id.train_time_5
                else -> R.id.train_time_1
            }
            views.setTextViewText(timeId, timeDisplay)
            
            // Set platform with duration and changes (including dot for delay if needed)
            val platformText = if (route.platform.isNotEmpty()) {
                if (route.delay > 0) "Platform ${route.platform} • ${route.duration} • ${route.changesText} •" 
                else "Platform ${route.platform} • ${route.duration} • ${route.changesText}"
            } else {
                if (route.delay > 0) "Platform TBD • ${route.duration} • ${route.changesText} •"
                else "Platform TBD • ${route.duration} • ${route.changesText}"
            }
            val platformId = when (index) {
                0 -> R.id.train_platform_1
                1 -> R.id.train_platform_2
                2 -> R.id.train_platform_3
                3 -> R.id.train_platform_4
                4 -> R.id.train_platform_5
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
                else -> R.id.train_delay_1
            }
            if (route.delay > 0) {
                views.setTextViewText(delayId, " +${route.delay}m delay")
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
            R.id.widget_train_item_5
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
        views.setViewVisibility(R.id.widget_no_trains, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.VISIBLE)
        hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        Log.d("WidgetProvider", "Showing error state for widget $appWidgetId: $errorMessage")
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        // Create deep link URI
        val deepLinkUri = "betterrail://widget?originId=${widgetData.originId}&destinationId=${widgetData.destinationId}"
        
        val openAppIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(deepLinkUri)).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("widget_origin_id", widgetData.originId)
            putExtra("widget_destination_id", widgetData.destinationId)
            putExtra("widget_origin_name", widgetData.originName)
            putExtra("widget_destination_name", widgetData.destinationName)
            putExtra("from_widget", true)
        }
        
        val openAppPendingIntent = PendingIntent.getActivity(
            context, appWidgetId, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)
        
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