package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetPreferences
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.utils.WidgetTrainFilter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.util.Calendar
import android.util.Log

/**
 * Unified CompactWidgetProvider that handles both 2x2 and 4x2 widget layouts.
 * This eliminates code duplication between separate provider classes.
 */
abstract class CompactWidgetProvider : BaseWidgetProvider() {

    protected abstract fun getWidgetType(): String
    protected abstract fun getConfigActivityClass(): Class<*>
    protected abstract fun showUpcomingTrains(views: RemoteViews, upcomingTrains: List<com.betterrail.widget.data.WidgetTrainItem>)
    protected abstract fun clearUpcomingTrains(views: RemoteViews)

    override fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "showConfigurationState called for ${getWidgetType()} widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        setupConfigurationViews(context, views)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed configuration state for ${getWidgetType()} widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing configuration state for ${getWidgetType()} widget $appWidgetId", e)
        }
    }

    override fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "showLoadingState called for ${getWidgetType()} widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        setStationBackground(views, widgetData.originId)
        
        setupLoadingViews(context, views, widgetData)
        clearUpcomingTrains(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed loading state for ${getWidgetType()} widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing loading state for ${getWidgetType()} widget $appWidgetId", e)
        }
    }

    override fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d(getLogTag(), "showScheduleData called for ${getWidgetType()} widget $appWidgetId with ${routes.size} routes")
        
        val views = RemoteViews(context.packageName, getLayoutResource())
        val futureTrains = WidgetTrainFilter.filterFutureTrains(routes)
        
        if (futureTrains.isEmpty()) {
            Log.d(getLogTag(), "Widget $appWidgetId: No future trains in cached data, fetching tomorrow's first train")
            loadTomorrowsFirstTrain(context, appWidgetManager, appWidgetId, widgetData, views)
            return
        }
        
        val nextTrain = futureTrains.first()
        setupScheduleViews(context, views, widgetData, nextTrain)
        showUpcomingTrains(views, futureTrains.drop(1))
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupWidgetViewBase(context, views, appWidgetId, widgetData, getWidgetType())
        
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully updated ${getWidgetType()} widget $appWidgetId with schedule data")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error updating ${getWidgetType()} widget $appWidgetId", e)
        }
    }

    override fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupErrorViews(context, views, widgetData, errorMessage)
        clearUpcomingTrains(views)
        
        setupWidgetViewBase(context, views, appWidgetId, widgetData, getWidgetType())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed error state for ${getWidgetType()} widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing error state for ${getWidgetType()} widget $appWidgetId", e)
        }
    }

    override fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        setupTomorrowsFallbackViews(context, views, widgetData)
        clearUpcomingTrains(views)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupWidgetViewBase(context, views, appWidgetId, widgetData, getWidgetType())
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Showed fallback tomorrow data for ${getWidgetType()} widget $appWidgetId")
    }

    private fun loadTomorrowsFirstTrain(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, views: RemoteViews) {
        Log.d(getLogTag(), "Loading tomorrow's first train for ${getWidgetType()} widget $appWidgetId")
        
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, DAY_OFFSET_TOMORROW)
        val tomorrowDate = DATE_FORMAT.format(calendar.time)
        
        setupTomorrowsLoadingViews(context, views, widgetData)
        clearUpcomingTrains(views)
        
        setupWidgetViewBase(context, views, appWidgetId, widgetData, getWidgetType())
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        // Cancel any existing job for this widget
        activeJobs[appWidgetId]?.cancel()
        
        val job = widgetScope.launch {
            try {
                Log.d(getLogTag(), "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate")
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = COMPACT_WIDGET_START_HOUR)
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d(getLogTag(), "Tomorrow API success for ${getWidgetType()} widget $appWidgetId: ${scheduleData.routes.size} routes")
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e(getLogTag(), "Tomorrow API error for ${getWidgetType()} widget $appWidgetId: ${error.message}", error)
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception getting tomorrow's trains for ${getWidgetType()} widget $appWidgetId", e)
                
                CoroutineScope(Dispatchers.Main).launch {
                    showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                }
            }
        }
        
        activeJobs[appWidgetId] = job
    }

    private fun showTomorrowsScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        
        if (routes.isNotEmpty()) {
            val firstTrain = routes.first()
            setupTomorrowsTrainViews(context, views, firstTrain)
            showUpcomingTrains(views, routes.drop(1))
        } else {
            setupNoTrainsViews(context, views)
            clearUpcomingTrains(views)
        }
        
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupWidgetViewBase(context, views, appWidgetId, widgetData, getWidgetType())
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Successfully updated ${getWidgetType()} widget $appWidgetId with tomorrow's data")
    }

    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        if (widgetData.originId.isEmpty()) {
            val intent = Intent(context, getConfigActivityClass()).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(getWidgetContainerId(), pendingIntent)
        } else {
            setupClickIntentsBase(
                context = context,
                views = views,
                appWidgetId = appWidgetId,
                widgetData = widgetData,
                clickTargetId = getWidgetContainerId(),
                useDeeplink = true,
                deeplinkPath = getWidgetType()
            )
        }
    }

    override fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d(getLogTag(), "${getWidgetType()} widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    override fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d(getLogTag(), "Scheduled updates for ${getWidgetType()} widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }

    // Abstract methods for widget-specific view setup
    protected abstract fun setupConfigurationViews(context: Context, views: RemoteViews)
    protected abstract fun setupLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData)
    protected abstract fun setupScheduleViews(context: Context, views: RemoteViews, widgetData: WidgetData, nextTrain: com.betterrail.widget.data.WidgetTrainItem)
    protected abstract fun setupErrorViews(context: Context, views: RemoteViews, widgetData: WidgetData, errorMessage: String)
    protected abstract fun setupTomorrowsFallbackViews(context: Context, views: RemoteViews, widgetData: WidgetData)
    protected abstract fun setupTomorrowsLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData)
    protected abstract fun setupTomorrowsTrainViews(context: Context, views: RemoteViews, firstTrain: com.betterrail.widget.data.WidgetTrainItem)
    protected abstract fun setupNoTrainsViews(context: Context, views: RemoteViews)
}