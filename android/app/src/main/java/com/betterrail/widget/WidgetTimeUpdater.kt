package com.betterrail.widget

import android.content.Context
import android.util.Log

/**
 * Simple utility to start time-based widget updates
 */
object WidgetTimeUpdater {
    
    fun startTimeBasedUpdates(context: Context) {
        try {
            Log.d("WidgetTimeUpdater", "Starting time-based widget updates")
            WidgetAlarmManager.scheduleRegularUpdates(context)
            Log.d("WidgetTimeUpdater", "Time-based widget updates started")
        } catch (e: Exception) {
            Log.e("WidgetTimeUpdater", "Failed to start time-based updates", e)
        }
    }
    
    fun stopTimeBasedUpdates(context: Context) {
        try {
            Log.d("WidgetTimeUpdater", "Stopping time-based widget updates")
            WidgetAlarmManager.cancelRegularUpdates(context)
            Log.d("WidgetTimeUpdater", "Time-based widget updates stopped")
        } catch (e: Exception) {
            Log.e("WidgetTimeUpdater", "Failed to stop time-based updates", e)
        }
    }
}