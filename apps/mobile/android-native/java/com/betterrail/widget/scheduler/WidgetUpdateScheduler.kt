package com.betterrail.widget.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import com.betterrail.widget.ModernCompactWidget2x2Provider
import com.betterrail.widget.ModernCompactWidget4x2Provider

/**
 * Manages periodic widget updates using AlarmManager
 */
object WidgetUpdateScheduler {
    private const val TAG = "WidgetUpdateScheduler"
    private const val UPDATE_INTERVAL_MINUTES = 1L // Update every minute for stale detection
    private const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.UPDATE_ALL_WIDGETS"
    private const val MINUTES_TO_MILLISECONDS = 60 * 1000L
    
    /**
     * Schedule periodic updates for all widgets
     */
    fun schedulePeriodicUpdates(context: Context) {
        Log.d(TAG, "Scheduling periodic widget updates every $UPDATE_INTERVAL_MINUTES minutes")
        
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val updateIntent = createUpdateIntent(context)
        
        // Cancel any existing alarms
        alarmManager.cancel(updateIntent)
        
        // Schedule new repeating alarm
        val intervalMillis = UPDATE_INTERVAL_MINUTES * MINUTES_TO_MILLISECONDS
        val triggerAtMillis = SystemClock.elapsedRealtime() + intervalMillis
        
        try {
            alarmManager.setInexactRepeating(
                AlarmManager.ELAPSED_REALTIME,
                triggerAtMillis,
                intervalMillis,
                updateIntent
            )
            Log.d(TAG, "Scheduled widget updates successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule widget updates", e)
        }
    }
    
    /**
     * Cancel periodic updates
     */
    fun cancelPeriodicUpdates(context: Context) {
        Log.d(TAG, "Cancelling periodic widget updates")
        
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val updateIntent = createUpdateIntent(context)
        
        alarmManager.cancel(updateIntent)
    }
    
    
    /**
     * Update all widgets immediately
     */
    fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Get all widget provider classes dynamically
        val widgetProviders = listOf(
            ModernCompactWidget2x2Provider::class.java,
            ModernCompactWidget4x2Provider::class.java
        )
        
        var totalWidgets = 0
        val updateResults = mutableListOf<String>()
        
        // Check each widget provider
        for (providerClass in widgetProviders) {
            val widgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, providerClass)
            )
            
            totalWidgets += widgetIds.size
            
            if (widgetIds.isNotEmpty()) {
                val intent = Intent(context, providerClass).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds)
                }
                context.sendBroadcast(intent)
                updateResults.add("${widgetIds.size} ${providerClass.simpleName}")
            }
        }
        
        if (totalWidgets == 0) {
            Log.d(TAG, "No widgets installed, cancelling periodic updates")
            cancelPeriodicUpdates(context)
            return
        }
        
        Log.d(TAG, "Updated $totalWidgets widgets: ${updateResults.joinToString(", ")}")
    }
    
    private fun createUpdateIntent(context: Context): PendingIntent {
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = ACTION_WIDGET_UPDATE
        }
        
        return PendingIntent.getBroadcast(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}