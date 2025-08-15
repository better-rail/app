package com.betterrail.widget.scheduler

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Receives alarm broadcasts and triggers widget updates
 */
class WidgetUpdateReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "WidgetUpdateReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        Log.d(TAG, "Received broadcast: ${intent.action}")
        
        when (intent.action) {
            "com.betterrail.widget.UPDATE_ALL_WIDGETS" -> {
                WidgetUpdateScheduler.updateAllWidgets(context)
            }
            Intent.ACTION_BOOT_COMPLETED -> {
                // Reschedule alarms after device reboot
                WidgetUpdateScheduler.schedulePeriodicUpdates(context)
                Log.d(TAG, "Rescheduled widget updates after boot")
            }
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                // Reschedule alarms after app update
                if (intent.dataString?.contains(context.packageName) == true) {
                    WidgetUpdateScheduler.schedulePeriodicUpdates(context)
                    Log.d(TAG, "Rescheduled widget updates after app update")
                }
            }
        }
    }
}