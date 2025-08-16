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
import java.text.SimpleDateFormat
import java.util.*

/**
 * Manages periodic widget updates using AlarmManager
 */
object WidgetUpdateScheduler {
    private const val TAG = "WidgetUpdateScheduler"
    private const val UPDATE_INTERVAL_MINUTES = 1L // Update every minute to catch train time changes
    private const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.UPDATE_ALL_WIDGETS"
    private const val MINUTES_TO_MILLISECONDS = 60 * 1000L
    private const val SMART_UPDATE_DELAY_MINUTES = 1L
    
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    
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
     * Schedule next smart update based on train departure times
     */
    fun scheduleSmartUpdate(context: Context, nextTrainDepartureTime: String) {
        try {
            if (nextTrainDepartureTime.isEmpty()) return
            
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val updateIntent = createUpdateIntent(context)
            
            // Parse the departure time
            val now = Calendar.getInstance()
            val trainTime = Calendar.getInstance()
            
            val timeParts = nextTrainDepartureTime.split(":")
            if (timeParts.size >= 2) {
                trainTime.set(Calendar.HOUR_OF_DAY, timeParts[0].toInt())
                trainTime.set(Calendar.MINUTE, timeParts[1].toInt())
                trainTime.set(Calendar.SECOND, 0)
                trainTime.set(Calendar.MILLISECOND, 0)
                
                // If the train time is in the past today, assume it's tomorrow
                if (trainTime.timeInMillis <= now.timeInMillis) {
                    trainTime.add(Calendar.DAY_OF_YEAR, 1)
                }
                
                // Schedule update at the exact train departure time
                val updateTime = trainTime.timeInMillis
                
                Log.d(TAG, "Scheduling smart update at ${timeFormat.format(Date(updateTime))} for train departure at $nextTrainDepartureTime")
                
                // Use inexact alarm instead of exact alarm to avoid USE_EXACT_ALARM permission
                // This may be less precise but still provides reasonable update timing
                alarmManager.set(
                    AlarmManager.RTC_WAKEUP,
                    updateTime,
                    updateIntent
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule smart update", e)
        }
    }
    
    /**
     * Update all widgets immediately
     */
    fun updateAllWidgets(context: Context) {
        Log.d(TAG, "Updating all widgets immediately")
        
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Update 2x2 widgets
        val widget2x2Ids = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(context, ModernCompactWidget2x2Provider::class.java)
        )
        if (widget2x2Ids.isNotEmpty()) {
            val intent2x2 = Intent(context, ModernCompactWidget2x2Provider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widget2x2Ids)
            }
            context.sendBroadcast(intent2x2)
            Log.d(TAG, "Updated ${widget2x2Ids.size} 2x2 widgets")
        }
        
        // Update 4x2 widgets
        val widget4x2Ids = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(context, ModernCompactWidget4x2Provider::class.java)
        )
        if (widget4x2Ids.isNotEmpty()) {
            val intent4x2 = Intent(context, ModernCompactWidget4x2Provider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widget4x2Ids)
            }
            context.sendBroadcast(intent4x2)
            Log.d(TAG, "Updated ${widget4x2Ids.size} 4x2 widgets")
        }
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