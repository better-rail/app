package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.utils.WidgetTrainFilter
import com.betterrail.widget.utils.TrainCardPopulator
import java.text.SimpleDateFormat
import java.util.*
import android.util.Log
import android.os.Bundle

class TrainScheduleWidgetProvider : BaseWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.ACTION_WIDGET_UPDATE"
    }
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getLayoutResource(): Int = R.layout.widget_train_schedule
    override fun getLogTag(): String = "WidgetProvider"

    override fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "showConfigurationState called for widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_title, "Tap to configure")
        views.setTextViewText(R.id.widget_subtitle, "Select your route")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        TrainCardPopulator.hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed configuration state for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing configuration state for widget $appWidgetId", e)
        }
    }

    override fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        views.setTextViewText(R.id.widget_subtitle, "Loading schedule...")
        views.setTextViewText(R.id.widget_updated_time, "")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
        TrainCardPopulator.hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed loading state for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing loading state for widget $appWidgetId", e)
        }
    }

    override fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d(getLogTag(), "showScheduleData called for widget $appWidgetId with ${routes.size} routes")
        
        val futureTrains = WidgetTrainFilter.filterFutureTrains(routes)
        
        if (futureTrains.isEmpty()) {
            loadTomorrowsTrains(context, appWidgetManager, appWidgetId, widgetData)
            return
        }
        
        Log.d(getLogTag(), "Using single view approach for reliable widget sizing")
        val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, futureTrains)
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully updated widget $appWidgetId with single view")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error updating widget $appWidgetId with single view", e)
        }
    }
    
    private fun createSingleView(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>): RemoteViews {
        val maxRows = getMaxRowsForWidgetSize(context, appWidgetManager, appWidgetId)
        return createViewForSize(context, widgetData, routes, maxRows)
    }
    
    private fun createViewForSize(context: Context, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>, maxRows: Int): RemoteViews {
        Log.d(getLogTag(), "Creating view for $maxRows rows with ${routes.size} available routes")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        
        if (routes.isEmpty()) {
            val currentTime = SimpleDateFormat(BaseWidgetProvider.TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "No trains found")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            TrainCardPopulator.hideAllTrainCards(views)
        } else {
            val currentTime = SimpleDateFormat(BaseWidgetProvider.TIME_FORMAT, Locale.getDefault()).format(Date())
            views.setTextViewText(R.id.widget_subtitle, "Next departures ($maxRows trains)")
            views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
            views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_error, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_train_list, android.view.View.VISIBLE)
            
            TrainCardPopulator.populateTrainCards(views, routes, maxRows)
            
            Log.d(getLogTag(), "Created view for size with $maxRows rows from ${routes.size} available routes")
        }
        
        return views
    }
    
    private fun getMaxRowsForWidgetSize(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int): Int {
        return try {
            val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
            val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
            val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 110)
            
            val effectiveHeight = maxHeight
            
            Log.d(getLogTag(), "Widget $appWidgetId size: minHeight=$minHeight, maxHeight=$maxHeight, using=$effectiveHeight")
            
            val headerHeight = 75
            val widgetPadding = 28
            val bottomMargin = 12
            val overhead = headerHeight + widgetPadding + bottomMargin
            val availableHeight = effectiveHeight - overhead
            val itemHeight = 48
            
            val calculatedRows = if (availableHeight < itemHeight) 1 else (availableHeight / itemHeight).toInt()
            
            val maxRows = when {
                calculatedRows >= 10 -> 10
                calculatedRows >= 9 -> minOf(calculatedRows, 10)
                calculatedRows >= 7 -> minOf(calculatedRows, 8)
                calculatedRows >= 5 -> minOf(calculatedRows, 6)
                calculatedRows >= 3 -> minOf(calculatedRows, 4)
                else -> minOf(calculatedRows, 2)
            }
            
            Log.d(getLogTag(), "Widget $appWidgetId: effectiveHeight=$effectiveHeight, availableHeight=$availableHeight, calculatedRows=$calculatedRows -> maxRows=$maxRows")
            maxRows
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error getting widget size, defaulting to 3 rows", e)
            3
        }
    }

    override fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_title, widgetData.label.ifEmpty { 
            val combinedText = "${widgetData.originName} → ${widgetData.destinationName}"
            if (combinedText.length > 30) {
                "${widgetData.originName}\n→ ${widgetData.destinationName}"
            } else {
                combinedText
            }
        })
        val currentTime = SimpleDateFormat(BaseWidgetProvider.TIME_FORMAT, Locale.getDefault()).format(Date())
        views.setTextViewText(R.id.widget_subtitle, errorMessage)
        views.setTextViewText(R.id.widget_updated_time, "Updated $currentTime")
        views.setViewVisibility(R.id.widget_train_list, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_no_trains_container, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_loading, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_error, android.view.View.VISIBLE)
        TrainCardPopulator.hideAllTrainCards(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed error state for widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing error state for widget $appWidgetId", e)
        }
    }

    override fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "showTomorrowsFallback called for widget $appWidgetId")
        
        val views = createSingleView(context, appWidgetManager, appWidgetId, widgetData, emptyList())
        
        views.setTextViewText(R.id.widget_subtitle, "No trains scheduled for route")
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Showed fallback tomorrow data for widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing fallback tomorrow data for widget $appWidgetId", e)
        }
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        val refreshIntent = Intent(context, TrainScheduleWidgetProvider::class.java)
        refreshIntent.action = ACTION_REFRESH
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, appWidgetId, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_refresh_button, refreshPendingIntent)
        
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            val widgetRefreshIntent = Intent(context, TrainScheduleWidgetProvider::class.java).apply {
                action = ACTION_WIDGET_UPDATE
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                putExtra("force_view_refresh", false)
            }
            val widgetRefreshPendingIntent = PendingIntent.getBroadcast(
                context, appWidgetId + 1000, widgetRefreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_train_list, widgetRefreshPendingIntent)
        }
    }

    override fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d(getLogTag(), "Widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    override fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d(getLogTag(), "Scheduled updates for widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }
}