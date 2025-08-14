package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.betterrail.widget.cache.WidgetCacheManager
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.utils.WidgetTrainFilter
import java.text.SimpleDateFormat
import java.util.*

/**
 * BroadcastReceiver that handles AlarmManager-triggered widget updates.
 * This updates widget views using cached data without making network requests.
 */
class WidgetUpdateReceiver : BroadcastReceiver() {
    
    companion object {
        const val ACTION_UPDATE_ALL_WIDGETS = "com.betterrail.widget.ACTION_UPDATE_ALL_WIDGETS"
        private const val TIME_FORMAT = "HH:mm"
        private val timeFormat = SimpleDateFormat(TIME_FORMAT, Locale.getDefault())
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("WidgetUpdateReceiver", "onReceive called with action: ${intent.action}")
        when (intent.action) {
            ACTION_UPDATE_ALL_WIDGETS -> {
                Log.d("WidgetUpdateReceiver", "*** ALARM TRIGGERED - Updating all widgets with cached data ***")
                updateAllWidgets(context)
                
                // Schedule the next alarm for continuous updates
                scheduleNextAlarm(context)
            }
            else -> {
                Log.w("WidgetUpdateReceiver", "Unknown action received: ${intent.action}")
            }
        }
    }
    
    /**
     * Updates all widgets using cached data filtered by current time.
     * If widget display time is stale, triggers a fresh API call.
     */
    private fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Clean up orphaned widget preferences for all widget types
        cleanupOrphanedWidgets(context, appWidgetManager)
        
        // Update compact widgets
        updateCompactWidgets(context, appWidgetManager)
    }
    
    private fun updateCompactWidgets(context: Context, appWidgetManager: AppWidgetManager) {
        val compact2x2WidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, CompactWidget2x2Provider::class.java)
        )
        val compact4x2WidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, CompactWidget4x2Provider::class.java)
        )
        val allCompactWidgetIds = compact2x2WidgetIds + compact4x2WidgetIds
        
        Log.d("WidgetUpdateReceiver", "Updating ${compact2x2WidgetIds.size} compact 2x2 widgets and ${compact4x2WidgetIds.size} compact 4x2 widgets")
        
        allCompactWidgetIds.forEach { appWidgetId ->
            try {
                updateWidget(context, appWidgetManager, appWidgetId)
            } catch (e: Exception) {
                Log.e("WidgetUpdateReceiver", "Failed to update compact widget $appWidgetId", e)
            }
        }
    }
    
    
    /**
     * Unified widget update method that handles all widget types consistently
     */
    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.d("WidgetUpdateReceiver", "Widget $appWidgetId not configured, skipping")
            return
        }
        
        // Get widget-specific cached data to avoid collisions
        val cachedData = WidgetCacheManager.getCachedDataWithWidgetId(
            context, 
            appWidgetId,
            widgetData.originId, 
            widgetData.destinationId, 
            widgetData.updateFrequencyMinutes
        )
        
        if (cachedData != null) {
            // Filter for future trains only
            val futureTrains = WidgetTrainFilter.filterFutureTrains(cachedData.routes)
            
            Log.d("WidgetUpdateReceiver", "Widget $appWidgetId: ${futureTrains.size} future trains from ${cachedData.routes.size} total")
            
            // Check if cache is stale (>6 hours) and needs API refresh
            val isCacheStale = WidgetCacheManager.isCacheStale(context, appWidgetId, widgetData.originId, widgetData.destinationId)
            
            // Check if we need to refresh the view due to stale display time
            val shouldRefreshView = isWidgetDisplayTimeStale(context, appWidgetId)
            
            val shouldUpdateWidget = shouldRefreshView || futureTrains.isEmpty()
            
            if (isCacheStale) {
                Log.d("WidgetUpdateReceiver", "*** STALE CACHE DETECTED (>6h) - Triggering API refresh for widget $appWidgetId ***")
                WidgetRefreshManager.forceRefreshWidget(context, appWidgetId)
                recordWidgetDisplayTime(context, appWidgetId)
            } else if (shouldUpdateWidget) {
                Log.d("WidgetUpdateReceiver", "Updating widget $appWidgetId (stale=${shouldRefreshView}, noTrains=${futureTrains.isEmpty()})")
                
                // Send update intent to refresh the view with current cached data
                WidgetRefreshManager.refreshWidgetView(context, appWidgetId)
                
                // Record new display time since we're updating the view
                recordWidgetDisplayTime(context, appWidgetId)
            } else {
                Log.d("WidgetUpdateReceiver", "Widget $appWidgetId is up-to-date, skipping update")
            }
        } else {
            Log.d("WidgetUpdateReceiver", "Widget $appWidgetId has no cached data, skipping update (alarm should never trigger API refresh)")
        }
    }
    
    /**
     * Checks if the widget's displayed "Updated" time is stale compared to current time.
     * A widget is considered stale if it was last updated more than 55 seconds ago.
     * This ensures the "Updated" timestamp gets refreshed approximately once per minute.
     */
    private fun isWidgetDisplayTimeStale(context: Context, appWidgetId: Int): Boolean {
        val prefs = context.getSharedPreferences("widget_display_times", Context.MODE_PRIVATE)
        val lastDisplayTime = prefs.getLong("widget_${appWidgetId}_display_time", 0L)
        
        if (lastDisplayTime == 0L) {
            Log.d("WidgetUpdateReceiver", "No display time recorded for widget $appWidgetId, considering stale")
            return true
        }
        
        val currentTime = System.currentTimeMillis()
        val stalenessThreshold = 55 * 1000L // 55 seconds in milliseconds (just under 1 minute)
        val timeSinceUpdate = currentTime - lastDisplayTime
        
        val isStale = timeSinceUpdate > stalenessThreshold
        Log.d("WidgetUpdateReceiver", "Widget $appWidgetId staleness check: timeSince=${timeSinceUpdate}ms (${timeSinceUpdate/1000}s), threshold=${stalenessThreshold}ms, isStale=$isStale")
        
        return isStale
    }
    
    /**
     * Records the current time as the display time for a widget.
     * This should be called whenever widget content is updated with fresh data.
     */
    fun recordWidgetDisplayTime(context: Context, appWidgetId: Int) {
        val prefs = context.getSharedPreferences("widget_display_times", Context.MODE_PRIVATE)
        val currentTime = System.currentTimeMillis()
        
        prefs.edit()
            .putLong("widget_${appWidgetId}_display_time", currentTime)
            .apply()
            
        Log.d("WidgetUpdateReceiver", "Recorded display time for widget $appWidgetId: ${timeFormat.format(java.util.Date(currentTime))}")
    }
    

    /**
     * Schedules the next alarm based on the earliest next train from all widgets
     */
    private fun scheduleNextAlarm(context: Context) {
        try {
            val nextTrainTime = getEarliestNextTrainTime(context)
            Log.d("WidgetUpdateReceiver", "Chaining next alarm for next train: $nextTrainTime")
            WidgetAlarmManager.scheduleNextUpdate(context, nextTrainTime)
        } catch (e: Exception) {
            Log.e("WidgetUpdateReceiver", "Failed to schedule next alarm", e)
        }
    }
    
    /**
     * Gets the earliest next train departure time from all configured widgets
     */
    private fun getEarliestNextTrainTime(context: Context): String? {
        val widgetManager = AppWidgetManager.getInstance(context)
        var earliestTime: String? = null
        var earliestTimeInMinutes = Int.MAX_VALUE
        
        // Check all compact widgets
        val compact2x2WidgetIds = widgetManager.getAppWidgetIds(ComponentName(context, CompactWidget2x2Provider::class.java))
        val compact4x2WidgetIds = widgetManager.getAppWidgetIds(ComponentName(context, CompactWidget4x2Provider::class.java))
        val allWidgetIds = compact2x2WidgetIds + compact4x2WidgetIds
        
        for (appWidgetId in allWidgetIds) {
            val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
            if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
                val cachedData = WidgetCacheManager.getCachedDataWithWidgetId(
                    context, appWidgetId, widgetData.originId, widgetData.destinationId, widgetData.updateFrequencyMinutes
                )
                cachedData?.let { 
                    val nextTrainTime = WidgetTrainFilter.getNextTrainDepartureTime(it.routes)
                    nextTrainTime?.let { time ->
                        val timeInMinutes = parseTimeToMinutes(time)
                        if (timeInMinutes != null && timeInMinutes < earliestTimeInMinutes) {
                            earliestTimeInMinutes = timeInMinutes
                            earliestTime = time
                        }
                    }
                }
            }
        }
        
        Log.d("WidgetUpdateReceiver", "Earliest next train time across all widgets: $earliestTime")
        return earliestTime
    }
    
    /**
     * Parses "HH:mm" time format to minutes from midnight for comparison
     */
    private fun parseTimeToMinutes(timeString: String): Int? {
        return try {
            val parts = timeString.split(":")
            if (parts.size == 2) {
                val hour = parts[0].toInt()
                val minute = parts[1].toInt()
                hour * 60 + minute
            } else null
        } catch (e: Exception) {
            null
        }
    }

    
    /**
     * Cleans up orphaned widget preferences for all widget types.
     * This removes preferences for widgets that no longer exist in the system.
     */
    private fun cleanupOrphanedWidgets(context: Context, appWidgetManager: AppWidgetManager) {
        try {
            // Get all active widget IDs from both widget providers
            val compact2x2WidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, CompactWidget2x2Provider::class.java)
            )
            val compact4x2WidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(context, CompactWidget4x2Provider::class.java)
            )
            val allValidWidgetIds = compact2x2WidgetIds + compact4x2WidgetIds
            
            Log.d("WidgetUpdateReceiver", "Found ${allValidWidgetIds.size} total valid widgets (${compact2x2WidgetIds.size} compact 2x2, ${compact4x2WidgetIds.size} compact 4x2)")
            
            // Clean up orphaned preferences
            WidgetPreferences.cleanupOrphanedWidgets(context, allValidWidgetIds)
        } catch (e: Exception) {
            Log.e("WidgetUpdateReceiver", "Error during widget cleanup", e)
        }
    }
}
