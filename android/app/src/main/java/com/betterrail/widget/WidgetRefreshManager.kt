package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.betterrail.widget.data.WidgetPreferences

/**
 * Centralized widget refresh manager for consistent API refresh behavior across all widget types.
 */
object WidgetRefreshManager {
    
    /**
     * Forces API refresh for a specific widget, regardless of widget type.
     */
    fun forceRefreshWidget(context: Context, appWidgetId: Int) {
        Log.d("WidgetRefreshManager", "forceRefreshWidget called for widget $appWidgetId")
        
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.w("WidgetRefreshManager", "Widget $appWidgetId not configured, skipping API refresh")
            return
        }
        
        // Determine which widget provider this widget belongs to
        val compactWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, CompactWidget2x2Provider::class.java)
        )
        val regularWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, TrainScheduleWidgetProvider::class.java)
        )
        
        val refreshIntent = when {
            compactWidgetIds.contains(appWidgetId) -> {
                Log.d("WidgetRefreshManager", "Widget $appWidgetId is a compact 2x2 widget, triggering API refresh")
                Intent(context, CompactWidget2x2Provider::class.java).apply {
                    action = CompactWidget2x2Provider.ACTION_WIDGET_UPDATE
                }
            }
            regularWidgetIds.contains(appWidgetId) -> {
                Log.d("WidgetRefreshManager", "Widget $appWidgetId is a regular widget, triggering API refresh")
                Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                    action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                }
            }
            else -> {
                Log.w("WidgetRefreshManager", "Widget $appWidgetId not found in any provider, defaulting to regular widget")
                Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                    action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                }
            }
        }
        
        refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        refreshIntent.putExtra("force_view_refresh", false) // Trigger API call for fresh data
        context.sendBroadcast(refreshIntent)
        
        Log.d("WidgetRefreshManager", "Successfully triggered API refresh for widget $appWidgetId")
    }
    
    /**
     * Forces view refresh (cache-only) for a specific widget, regardless of widget type.
     */
    fun refreshWidgetView(context: Context, appWidgetId: Int) {
        Log.d("WidgetRefreshManager", "refreshWidgetView called for widget $appWidgetId")
        
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        
        if (widgetData.originId.isEmpty() || widgetData.destinationId.isEmpty()) {
            Log.w("WidgetRefreshManager", "Widget $appWidgetId not configured, skipping view refresh")
            return
        }
        
        // Determine which widget provider this widget belongs to
        val compactWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, CompactWidget2x2Provider::class.java)
        )
        val regularWidgetIds = appWidgetManager.getAppWidgetIds(
            ComponentName(context, TrainScheduleWidgetProvider::class.java)
        )
        
        val refreshIntent = when {
            compactWidgetIds.contains(appWidgetId) -> {
                Log.d("WidgetRefreshManager", "Widget $appWidgetId is a compact 2x2 widget, refreshing view from cache")
                Intent(context, CompactWidget2x2Provider::class.java).apply {
                    action = CompactWidget2x2Provider.ACTION_WIDGET_UPDATE
                }
            }
            regularWidgetIds.contains(appWidgetId) -> {
                Log.d("WidgetRefreshManager", "Widget $appWidgetId is a regular widget, refreshing view from cache")
                Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                    action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                }
            }
            else -> {
                Log.w("WidgetRefreshManager", "Widget $appWidgetId not found in any provider, defaulting to regular widget")
                Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                    action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                }
            }
        }
        
        refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        refreshIntent.putExtra("force_view_refresh", true) // Use cached data only
        context.sendBroadcast(refreshIntent)
        
        Log.d("WidgetRefreshManager", "Successfully triggered view refresh for widget $appWidgetId")
    }
}