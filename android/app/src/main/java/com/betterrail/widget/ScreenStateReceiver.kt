package com.betterrail.widget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.util.Log

class ScreenStateReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_SCREEN_ON -> {
                Log.d("ScreenStateReceiver", "Screen turned on - updating widgets")
                updateAllWidgets(context)
            }
            Intent.ACTION_USER_PRESENT -> {
                // User unlocked the device
                Log.d("ScreenStateReceiver", "User unlocked device - updating widgets")
                updateAllWidgets(context)
            }
        }
    }
    
    private fun updateAllWidgets(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Update all 4x2 widgets
        val regularWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, TrainScheduleWidgetProvider::class.java)
        )
        
        // Update all 2x2 widgets
        val compactWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, CompactWidget2x2Provider::class.java)
        )
        
        Log.d("ScreenStateReceiver", "Found ${regularWidgetIds.size} regular widgets and ${compactWidgetIds.size} compact widgets")
        
        // Trigger refresh for 4x2 widgets
        regularWidgetIds.forEach { appWidgetId ->
            val refreshIntent = Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            context.sendBroadcast(refreshIntent)
            Log.d("ScreenStateReceiver", "Triggered refresh for regular widget $appWidgetId")
        }
        
        // Trigger refresh for 2x2 widgets
        compactWidgetIds.forEach { appWidgetId ->
            val refreshIntent = Intent(context, CompactWidget2x2Provider::class.java).apply {
                action = CompactWidget2x2Provider.ACTION_WIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            context.sendBroadcast(refreshIntent)
            Log.d("ScreenStateReceiver", "Triggered refresh for compact widget $appWidgetId")
        }
    }
}