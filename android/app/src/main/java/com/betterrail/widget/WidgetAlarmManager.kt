package com.betterrail.widget

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * AlarmManager-based widget update system for critical time-sensitive widgets.
 * This ensures widgets update every minute regardless of screen state or battery optimizations.
 */
object WidgetAlarmManager {
    private const val WIDGET_UPDATE_REQUEST_CODE = 12345
    private const val UPDATE_INTERVAL_MS = 60000L // 1 minute (more reasonable for train data)
    
    /**
     * Schedules regular widget view updates using AlarmManager.
     * This is the Android official way for time-critical widgets.
     */
    fun scheduleRegularUpdates(context: Context) {
        Log.d("WidgetAlarmManager", "scheduleRegularUpdates() called")
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
        
        if (alarmManager == null) {
            Log.e("WidgetAlarmManager", "AlarmManager not available")
            return
        }
        
        Log.d("WidgetAlarmManager", "AlarmManager obtained successfully")
        
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = WidgetUpdateReceiver.ACTION_UPDATE_ALL_WIDGETS
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            WIDGET_UPDATE_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Cancel any existing alarm
        alarmManager.cancel(pendingIntent)
        
        val startTime = System.currentTimeMillis() + UPDATE_INTERVAL_MS
        
        // Use setExactAndAllowWhileIdle for precise 1-minute timing
        // This bypasses Android's alarm batching for critical time-sensitive apps
        scheduleNextExactAlarm(alarmManager, startTime, pendingIntent)
        
        
        Log.d("WidgetAlarmManager", "Scheduled regular widget updates every ${UPDATE_INTERVAL_MS / 1000} seconds")
        Log.d("WidgetAlarmManager", "First alarm will fire at: ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date(startTime))}")
    }
    
    /**
     * Schedules the next alarm in the chain - used by WidgetUpdateReceiver.
     * This maintains precise timing by scheduling exactly UPDATE_INTERVAL_MS from now.
     */
    fun scheduleNextUpdate(context: Context) {
        Log.d("WidgetAlarmManager", "scheduleNextUpdate() called - chaining next alarm")
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
        
        if (alarmManager == null) {
            Log.e("WidgetAlarmManager", "AlarmManager not available for chaining")
            return
        }
        
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = WidgetUpdateReceiver.ACTION_UPDATE_ALL_WIDGETS
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            WIDGET_UPDATE_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        // Schedule next alarm exactly UPDATE_INTERVAL_MS from now (no cancel needed)
        val nextTime = System.currentTimeMillis() + UPDATE_INTERVAL_MS
        
        scheduleNextExactAlarm(alarmManager, nextTime, pendingIntent)
        
        Log.d("WidgetAlarmManager", "Next alarm chained for: ${java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault()).format(java.util.Date(nextTime))}")
    }
    
    /**
     * Cancels all scheduled widget updates.
     */
    fun cancelRegularUpdates(context: Context) {
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
        
        if (alarmManager == null) {
            Log.e("WidgetAlarmManager", "AlarmManager not available")
            return
        }
        
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = WidgetUpdateReceiver.ACTION_UPDATE_ALL_WIDGETS
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            WIDGET_UPDATE_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        alarmManager.cancel(pendingIntent)
        Log.d("WidgetAlarmManager", "Cancelled regular widget updates")
    }
    
    /**
     * Checks if widget updates are currently scheduled.
     */
    fun areUpdatesScheduled(context: Context): Boolean {
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = WidgetUpdateReceiver.ACTION_UPDATE_ALL_WIDGETS
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            WIDGET_UPDATE_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        
        return pendingIntent != null
    }
    
    /**
     * Schedules a single exact alarm.
     * This ensures precise 1-minute intervals without Android batching.
     */
    private fun scheduleNextExactAlarm(alarmManager: AlarmManager, triggerTime: Long, pendingIntent: PendingIntent) {
        
        try {
            // Check if we can schedule exact alarms on Android 12+
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    Log.d("WidgetAlarmManager", "No exact alarm permission, using single alarm fallback")
                    // Use single alarm that will reschedule itself
                    alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerTime,
                        pendingIntent
                    )
                    return
                }
            }
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    // Use setExactAndAllowWhileIdle for API 23+ (bypasses doze mode)
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
                } else {
                    // Use setExact for older versions
                alarmManager.setExact(
                    AlarmManager.RTC_WAKEUP,
                    triggerTime,
                    pendingIntent
                )
                }
        } catch (e: SecurityException) {
            Log.w("WidgetAlarmManager", "SecurityException with exact alarms, using single alarm fallback", e)
            // Fallback to single alarm if exact alarms are not permitted
            alarmManager.set(
                AlarmManager.RTC_WAKEUP,
                triggerTime,
                pendingIntent
            )
        }
    }
    
    /**
     * Triggers an immediate widget update for testing/debugging.
     */
    fun triggerImmediateUpdate(context: Context) {
        Log.d("WidgetAlarmManager", "triggerImmediateUpdate() called")
        val intent = Intent(context, WidgetUpdateReceiver::class.java).apply {
            action = WidgetUpdateReceiver.ACTION_UPDATE_ALL_WIDGETS
        }
        context.sendBroadcast(intent)
        Log.d("WidgetAlarmManager", "Sent immediate broadcast to WidgetUpdateReceiver")
    }
    
    /**
     * Debug method to check current alarm status
     */
    fun getAlarmStatus(context: Context): String {
        val alarmManager = ContextCompat.getSystemService(context, AlarmManager::class.java)
        val hasPermission = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            alarmManager?.canScheduleExactAlarms() ?: false
        } else {
            true
        }
        val isScheduled = areUpdatesScheduled(context)
        return "Alarm permission: $hasPermission, Is scheduled: $isScheduled"
    }
}