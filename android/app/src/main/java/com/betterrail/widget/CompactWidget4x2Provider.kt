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
import java.text.SimpleDateFormat
import java.util.*
import java.util.Calendar
import android.util.Log
import android.os.Bundle

class CompactWidget4x2Provider : BaseWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.compact4x2.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.compact4x2.ACTION_WIDGET_UPDATE"
    }
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getLayoutResource(): Int = R.layout.widget_compact_4x2
    override fun getWidgetContainerId(): Int = R.id.widget_container_compact_4x2
    override fun getLogTag(): String = "CompactWidget4x2Provider"

    override fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "showConfigurationState called for compact 4x2 widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, context.getString(R.string.tap_to_configure))
        views.setTextViewText(R.id.widget_destination, context.getString(R.string.select_your_route))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.platform_default))
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.train_default))
        
        // Clear upcoming trains list
        clearUpcomingTrains(views)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed configuration state for compact 4x2 widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing configuration state for compact 4x2 widget $appWidgetId", e)
        }
    }

    override fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "showLoadingState called for compact 4x2 widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        setStationBackground(views, widgetData.originId)
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.loading) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
        
        clearUpcomingTrains(views)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed loading state for compact 4x2 widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing loading state for compact 4x2 widget $appWidgetId", e)
        }
    }

    override fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d(getLogTag(), "showScheduleData called for compact 4x2 widget $appWidgetId with ${routes.size} routes")
        
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        val futureTrains = WidgetTrainFilter.filterFutureTrains(routes)
        
        if (futureTrains.isEmpty()) {
            Log.d(getLogTag(), "Widget $appWidgetId: No future trains in cached data (all have departed), fetching tomorrow's first train from API")
            loadTomorrowsFirstTrain(context, appWidgetManager, appWidgetId, widgetData, views)
            return
        } else {
            val nextTrain = futureTrains.first()
            
            views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
            views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
            views.setTextViewText(R.id.widget_next_train_time, nextTrain.departureTime)
            views.setTextViewText(R.id.widget_arrival_time, nextTrain.arrivalTime)
            
            views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
            views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FFFF9999"))
            
            val platformText = if (nextTrain.platform.isNotEmpty()) {
                context.getString(R.string.platform_number, nextTrain.platform)
            } else {
                context.getString(R.string.platform_default)
            }
            val trainNumber = nextTrain.departureTime.replace(":", "")
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = context.getString(R.string.train_number, trainNumber)
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            // Show upcoming trains
            showUpcomingTrains(views, futureTrains.drop(1))
            
            Log.d(getLogTag(), "Set train data: ${StationsData.getStationName(context, widgetData.originId)} -> ${StationsData.getStationName(context, widgetData.destinationId)}, next train at ${nextTrain.departureTime}")
        }
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        setupWidgetViewBase(context, views, appWidgetId, widgetData, "widget4x2")
        try {
            Log.d(getLogTag(), "About to call updateAppWidget for compact 4x2 widget $appWidgetId with station background for originId: ${widgetData.originId}")
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully updated compact 4x2 widget $appWidgetId with schedule data")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error updating compact 4x2 widget $appWidgetId", e)
        }
    }

    private fun showUpcomingTrains(views: RemoteViews, upcomingTrains: List<com.betterrail.widget.data.WidgetTrainItem>) {
        // Show up to 5 upcoming trains
        val rowIds = listOf(
            R.id.widget_upcoming_row_1,
            R.id.widget_upcoming_row_2,
            R.id.widget_upcoming_row_3,
            R.id.widget_upcoming_row_4,
            R.id.widget_upcoming_row_5
        )
        
        val trainIds = listOf(
            R.id.widget_upcoming_train_1,
            R.id.widget_upcoming_train_2,
            R.id.widget_upcoming_train_3,
            R.id.widget_upcoming_train_4,
            R.id.widget_upcoming_train_5
        )
        
        val arrivalIds = listOf(
            R.id.widget_upcoming_arrival_1,
            R.id.widget_upcoming_arrival_2,
            R.id.widget_upcoming_arrival_3,
            R.id.widget_upcoming_arrival_4,
            R.id.widget_upcoming_arrival_5
        )
        
        for (i in rowIds.indices) {
            if (i < upcomingTrains.size) {
                val train = upcomingTrains[i]
                views.setTextViewText(trainIds[i], train.departureTime)
                views.setTextViewText(arrivalIds[i], train.arrivalTime)
                views.setViewVisibility(rowIds[i], android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(rowIds[i], android.view.View.GONE)
            }
        }
    }
    
    private fun clearUpcomingTrains(views: RemoteViews) {
        val rowIds = listOf(
            R.id.widget_upcoming_row_1,
            R.id.widget_upcoming_row_2,
            R.id.widget_upcoming_row_3,
            R.id.widget_upcoming_row_4,
            R.id.widget_upcoming_row_5
        )
        
        for (rowId in rowIds) {
            views.setViewVisibility(rowId, android.view.View.GONE)
        }
    }

    private fun loadTomorrowsFirstTrain(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, views: RemoteViews) {
        Log.d(getLogTag(), "Loading tomorrow's first train for compact 4x2 widget $appWidgetId")
        
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, DAY_OFFSET_TOMORROW)
        val tomorrowDate = BaseWidgetProvider.DATE_FORMAT.format(calendar.time)
        
        Log.d(getLogTag(), "Fetching trains for tomorrow: $tomorrowDate")
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        clearUpcomingTrains(views)
        
        setupWidgetViewBase(context, views, appWidgetId, widgetData, "widget4x2")
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        // Cancel any existing job for this widget
        BaseWidgetProvider.activeJobs[appWidgetId]?.cancel()
        
        val job = BaseWidgetProvider.widgetScope.launch {
            try {
                Log.d(getLogTag(), "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate, hour=$COMPACT_WIDGET_START_HOUR")
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = COMPACT_WIDGET_START_HOUR)
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d(getLogTag(), "Tomorrow API success for compact 4x2 widget $appWidgetId: ${scheduleData.routes.size} routes")
                        if (scheduleData.routes.isEmpty()) {
                            Log.w(getLogTag(), "Tomorrow API returned $EMPTY_ROUTES_COUNT routes for $tomorrowDate from ${widgetData.originId} to ${widgetData.destinationId}")
                        }
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e(getLogTag(), "Tomorrow API error for compact 4x2 widget $appWidgetId: ${error.message}", error)
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception getting tomorrow's trains for compact 4x2 widget $appWidgetId", e)
                
                CoroutineScope(Dispatchers.Main).launch {
                    showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                }
            }
        }
        
        // Track this job for this specific widget
        BaseWidgetProvider.activeJobs[appWidgetId] = job
    }

    private fun showTomorrowsScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        
        if (routes.isNotEmpty()) {
            val firstTrain = routes.first()
            
            views.setTextViewText(R.id.widget_next_train_time, firstTrain.departureTime)
            views.setTextViewText(R.id.widget_arrival_time, firstTrain.arrivalTime)
            
            val platformText = if (firstTrain.platform.isNotEmpty()) {
                context.getString(R.string.platform_number, firstTrain.platform)
            } else {
                context.getString(R.string.platform_default)
            }
            val trainNumber = firstTrain.departureTime.replace(":", "")
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = context.getString(R.string.train_number, trainNumber)
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            // Show upcoming trains for tomorrow
            showUpcomingTrains(views, routes.drop(1))
            
            Log.d(getLogTag(), "Set tomorrow's train data: ${StationsData.getStationName(context, widgetData.originId)} -> ${StationsData.getStationName(context, widgetData.destinationId)}, train at ${firstTrain.departureTime}")
        } else {
            views.setTextViewText(R.id.widget_next_train_time, context.getString(R.string.no_trains))
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
            views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
            views.setTextViewText(R.id.widget_train_number, "")
            clearUpcomingTrains(views)
        }
        
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupWidgetViewBase(context, views, appWidgetId, widgetData, "widget4x2")
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Successfully updated compact 4x2 widget $appWidgetId with tomorrow's data")
    }

    override fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
        views.setTextViewText(R.id.widget_train_number, "")
        
        clearUpcomingTrains(views)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setupWidgetViewBase(context, views, appWidgetId, widgetData, "widget4x2")
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Showed fallback tomorrow data for compact 4x2 widget $appWidgetId")
    }
    

    override fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, errorMessage)
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.tap_to_retry))
        
        clearUpcomingTrains(views)
        
        setupWidgetViewBase(context, views, appWidgetId, widgetData, "widget4x2")
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed error state for compact 4x2 widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing error state for compact 4x2 widget $appWidgetId", e)
        }
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        if (widgetData.originId.isEmpty()) {
            // Show configuration activity for unconfigured widgets
            val intent = Intent(context, CompactWidget4x2ConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(getWidgetContainerId(), pendingIntent)
        } else {
            // Use the reusable deeplink helper from BaseWidgetProvider
            setupClickIntentsBase(
                context = context,
                views = views,
                appWidgetId = appWidgetId,
                widgetData = widgetData,
                clickTargetId = getWidgetContainerId(),
                useDeeplink = true,
                deeplinkPath = "widget4x2"
            )
        }
    }

    override fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d(getLogTag(), "Compact 4x2 widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    override fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d(getLogTag(), "Scheduled updates for compact 4x2 widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }
}