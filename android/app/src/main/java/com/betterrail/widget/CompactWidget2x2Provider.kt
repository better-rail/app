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
import com.betterrail.widget.data.StationsData
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

class CompactWidget2x2Provider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.compact.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.compact.ACTION_WIDGET_UPDATE"
        private const val TIME_FORMAT = "HH:mm"
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    }
    
    private val apiService = RailApiService()
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d("CompactWidgetProvider", "onUpdate called for ${appWidgetIds.size} compact widgets")
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }
    
    override fun onAppWidgetOptionsChanged(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
        Log.d("CompactWidgetProvider", "onAppWidgetOptionsChanged for compact widget $appWidgetId")
        updateAppWidget(context, appWidgetManager, appWidgetId)
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        Log.d("CompactWidgetProvider", "onReceive: ${intent.action}")
        when (intent.action) {
            ACTION_REFRESH -> {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(
                    android.content.ComponentName(context, CompactWidget2x2Provider::class.java)
                )
                Log.d("CompactWidgetProvider", "Manual refresh for ${appWidgetIds.size} compact widgets")
                for (appWidgetId in appWidgetIds) {
                    refreshWidget(context, appWidgetManager, appWidgetId)
                }
            }
            ACTION_WIDGET_UPDATE -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1)
                if (appWidgetId != -1) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    Log.d("CompactWidgetProvider", "Triggered update for compact widget $appWidgetId")
                    refreshWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        Log.d("CompactWidgetProvider", "onDeleted for compact widgets: ${appWidgetIds.joinToString()}")
        for (appWidgetId in appWidgetIds) {
            // Cancel scheduled updates
            WidgetUpdateWorker.cancelWidgetUpdates(context, appWidgetId)
            
            // Clean up widget preferences
            WidgetPreferences.deleteWidgetData(context, appWidgetId)
            
            Log.d("CompactWidgetProvider", "Cleaned up compact widget $appWidgetId")
        }
        super.onDeleted(context, appWidgetIds)
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("CompactWidgetProvider", "Compact widget provider enabled")
    }
    
    override fun onDisabled(context: Context) {
        super.onDisabled(context)
        Log.d("CompactWidgetProvider", "Compact widget provider disabled")
        WidgetCacheManager.clearAllCache(context)
    }

    private fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("CompactWidgetProvider", "updateAppWidget called for compact widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.d("CompactWidgetProvider", "Compact widget $appWidgetId not configured yet")
            showConfigurationState(context, appWidgetManager, appWidgetId)
        } else {
            Log.d("CompactWidgetProvider", "Compact widget $appWidgetId configured: ${widgetData.originName} -> ${widgetData.destinationName}")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = true)
        }
    }
    
    private fun refreshWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("CompactWidgetProvider", "refreshWidget called for compact widget $appWidgetId")
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            Log.d("CompactWidgetProvider", "Force refreshing compact widget $appWidgetId")
            loadWidgetData(context, appWidgetManager, appWidgetId, widgetData, useCache = false)
        }
    }

    private fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d("CompactWidgetProvider", "showConfigurationState called for compact widget $appWidgetId")
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        views.setTextViewText(R.id.widget_station_name, "Tap to configure")
        views.setTextViewText(R.id.widget_destination, "Select your route")
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, "Platform --")
        views.setTextViewText(R.id.widget_train_number, "Train ---")
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        // Set default station background
        views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("CompactWidgetProvider", "Successfully showed configuration state for compact widget $appWidgetId")
        } catch (e: Exception) {
            Log.e("CompactWidgetProvider", "Error showing configuration state for compact widget $appWidgetId", e)
        }
    }

    private fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d("CompactWidgetProvider", "showLoadingState called for compact widget $appWidgetId")
        Log.d("CompactWidgetProvider", "Creating new RemoteViews for showLoadingState with layout: R.layout.widget_compact_2x2")
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        // Show loading text overlay
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        // Set station background
        setStationBackground(views, widgetData.originId)
        
        // Set basic info
        views.setTextViewText(R.id.widget_station_name, widgetData.originName.ifEmpty { "Loading..." })
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "...")
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("CompactWidgetProvider", "Successfully showed loading state for compact widget $appWidgetId")
        } catch (e: Exception) {
            Log.e("CompactWidgetProvider", "Error showing loading state for compact widget $appWidgetId", e)
        }
    }

    private fun loadWidgetData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, useCache: Boolean) {
        // Show loading state immediately
        showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
        
        // Try to use cached data first if requested
        if (useCache) {
            val cachedData = WidgetCacheManager.getCachedData(context, widgetData.originId, widgetData.destinationId, widgetData.updateFrequencyMinutes)
            if (cachedData != null) {
                Log.d("CompactWidgetProvider", "Using cached data for compact widget $appWidgetId")
                showScheduleData(context, appWidgetManager, appWidgetId, widgetData, cachedData.routes)
                return
            }
        }
        
        // Load fresh data from API
        Log.d("CompactWidgetProvider", "Loading fresh data for compact widget $appWidgetId from API")
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId)
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d("CompactWidgetProvider", "API success for compact widget $appWidgetId: ${scheduleData.routes.size} routes")
                        
                        // Cache the fresh data
                        WidgetCacheManager.cacheData(context, widgetData.originId, widgetData.destinationId, scheduleData)
                        
                        // Update UI on main thread
                        CoroutineScope(Dispatchers.Main).launch {
                            showScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e("CompactWidgetProvider", "API error for compact widget $appWidgetId", error)
                        
                        // Update UI on main thread
                        CoroutineScope(Dispatchers.Main).launch {
                            showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Failed to load trains")
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("CompactWidgetProvider", "Exception for compact widget $appWidgetId", e)
                
                // Update UI on main thread
                CoroutineScope(Dispatchers.Main).launch {
                    showErrorState(context, appWidgetManager, appWidgetId, widgetData, "Connection error")
                }
            }
        }
    }

    private fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d("CompactWidgetProvider", "showScheduleData called for compact widget $appWidgetId with ${routes.size} routes")
        Log.d("CompactWidgetProvider", "Creating new RemoteViews for showScheduleData with layout: R.layout.widget_compact_2x2")
        
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        if (routes.isEmpty()) {
            // No trains today, try to get tomorrow's first train
            loadTomorrowsFirstTrain(context, appWidgetManager, appWidgetId, widgetData, views)
            return
        } else {
            val nextTrain = routes.first()
            
            views.setTextViewText(R.id.widget_station_name, widgetData.originName)
            views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
            views.setTextViewText(R.id.widget_train_time, nextTrain.departureTime)
            
            // Set "NEXT TRAIN" label in light red
            views.setTextViewText(R.id.widget_train_label, "NEXT TRAIN")
            views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FFFF9999"))
            
            val platformText = if (nextTrain.platform.isNotEmpty()) {
                "Platform ${nextTrain.platform}"
            } else {
                "Platform TBD"
            }
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = "Train ${nextTrain.departureTime.replace(":", "")}"
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            Log.d("CompactWidgetProvider", "Set train data: ${widgetData.originName} -> ${widgetData.destinationName}, train at ${nextTrain.departureTime}")
        }
        
        // Hide loading overlay
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        // Set station background
        setStationBackground(views, widgetData.originId)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            Log.d("CompactWidgetProvider", "About to call updateAppWidget for compact widget $appWidgetId with station background for originId: ${widgetData.originId}")
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("CompactWidgetProvider", "Successfully updated compact widget $appWidgetId with schedule data")
        } catch (e: Exception) {
            Log.e("CompactWidgetProvider", "Error updating compact widget $appWidgetId", e)
        }
    }

    private fun loadTomorrowsFirstTrain(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, views: RemoteViews) {
        Log.d("CompactWidgetProvider", "Loading tomorrow's first train for compact widget $appWidgetId")
        
        // Calculate tomorrow's date
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, 1)
        val tomorrowDate = DATE_FORMAT.format(calendar.time)
        
        Log.d("CompactWidgetProvider", "Fetching trains for tomorrow: $tomorrowDate")
        
        // Show loading state while we fetch tomorrow's data
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "...")
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        // Make API call for tomorrow's trains
        CoroutineScope(Dispatchers.IO).launch {
            try {
                Log.d("CompactWidgetProvider", "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate, hour=04:00")
                // Use 04:00 as starting hour to get early morning trains - this should be before any current time
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = "04:00")
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d("CompactWidgetProvider", "Tomorrow API success for compact widget $appWidgetId: ${scheduleData.routes.size} routes")
                        if (scheduleData.routes.isEmpty()) {
                            Log.w("CompactWidgetProvider", "Tomorrow API returned 0 routes for $tomorrowDate from ${widgetData.originId} to ${widgetData.destinationId}")
                        }
                        
                        // Update UI on main thread
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e("CompactWidgetProvider", "Tomorrow API error for compact widget $appWidgetId: ${error.message}", error)
                        
                        // Update UI on main thread with fallback
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e("CompactWidgetProvider", "Exception getting tomorrow's trains for compact widget $appWidgetId", e)
                
                // Update UI on main thread with fallback
                CoroutineScope(Dispatchers.Main).launch {
                    showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                }
            }
        }
    }

    private fun showTomorrowsScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        
        if (routes.isNotEmpty()) {
            val firstTrain = routes.first()
            
            views.setTextViewText(R.id.widget_train_time, firstTrain.departureTime)
            
            val platformText = if (firstTrain.platform.isNotEmpty()) {
                "Platform ${firstTrain.platform}"
            } else {
                "Platform TBD"
            }
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = "Train ${firstTrain.departureTime.replace(":", "")}"
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            Log.d("CompactWidgetProvider", "Set tomorrow's train data: ${widgetData.originName} -> ${widgetData.destinationName}, train at ${firstTrain.departureTime}")
        } else {
            // No trains tomorrow either
            views.setTextViewText(R.id.widget_train_time, "No trains")
            views.setTextViewText(R.id.widget_platform, "Check schedule")
            views.setTextViewText(R.id.widget_train_number, "")
        }
        
        // Set "TOMORROW" label in purple
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d("CompactWidgetProvider", "Successfully updated compact widget $appWidgetId with tomorrow's data")
    }

    private fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "--:--") // Fallback when no data available
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, "Check schedule")
        views.setTextViewText(R.id.widget_train_number, "")
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d("CompactWidgetProvider", "Showed fallback tomorrow data for compact widget $appWidgetId")
    }
    
    private fun setStationBackground(views: RemoteViews, originId: String) {
        try {
            val imageResource = StationsData.getStationImageResource(originId)
            views.setImageViewResource(R.id.widget_station_background, imageResource)
            Log.d("CompactWidgetProvider", "Set station background for $originId -> $imageResource")
        } catch (e: Exception) {
            Log.e("CompactWidgetProvider", "Error setting station background for $originId", e)
            views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        }
    }

    private fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, R.layout.widget_compact_2x2)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        // Set error content
        views.setTextViewText(R.id.widget_station_name, widgetData.originName.ifEmpty { "Error" })
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, ":-(")
        views.setTextViewText(R.id.widget_platform, errorMessage)
        views.setTextViewText(R.id.widget_train_number, "Tap to retry")
        
        // Set station background
        setStationBackground(views, widgetData.originId)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d("CompactWidgetProvider", "Successfully showed error state for compact widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e("CompactWidgetProvider", "Error showing error state for compact widget $appWidgetId", e)
        }
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        // Only set up click intent for unconfigured widgets to allow initial setup
        if (widgetData.originId.isEmpty()) {
            // Open configuration for unconfigured widgets
            val intent = Intent(context, CompactWidget2x2ConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container_compact, pendingIntent)
        }
        // For configured widgets, do not set any click intent - widget becomes non-clickable
    }

    // Public method for configuration activity
    fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d("CompactWidgetProvider", "Compact widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    // Call this method after widget configuration is complete
    fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d("CompactWidgetProvider", "Scheduled updates for compact widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }
}