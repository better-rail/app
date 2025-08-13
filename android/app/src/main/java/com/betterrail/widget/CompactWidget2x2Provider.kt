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

class CompactWidget2x2Provider : BaseWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.compact.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.compact.ACTION_WIDGET_UPDATE"
    }
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getLayoutResource(): Int = R.layout.widget_compact_2x2
    override fun getLogTag(): String = "CompactWidgetProvider"

    override fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        Log.d(getLogTag(), "showConfigurationState called for compact widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, "Tap to configure")
        views.setTextViewText(R.id.widget_destination, "Select your route")
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, "Platform --")
        views.setTextViewText(R.id.widget_train_number, "Train ---")
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        
        setupClickIntents(context, views, appWidgetId, WidgetData())
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed configuration state for compact widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing configuration state for compact widget $appWidgetId", e)
        }
    }

    override fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "showLoadingState called for compact widget $appWidgetId")
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        setStationBackground(views, widgetData.originId)
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName.ifEmpty { "Loading..." })
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed loading state for compact widget $appWidgetId")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing loading state for compact widget $appWidgetId", e)
        }
    }

    override fun showScheduleData(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, routes: List<com.betterrail.widget.data.WidgetTrainItem>) {
        Log.d(getLogTag(), "showScheduleData called for compact widget $appWidgetId with ${routes.size} routes")
        
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        val futureTrains = WidgetTrainFilter.filterFutureTrains(routes)
        
        if (futureTrains.isEmpty()) {
            Log.d(getLogTag(), "Widget $appWidgetId: No future trains in cached data (all have departed), fetching tomorrow's first train from API")
            loadTomorrowsFirstTrain(context, appWidgetManager, appWidgetId, widgetData, views)
            return
        } else {
            val nextTrain = futureTrains.first()
            
            views.setTextViewText(R.id.widget_station_name, widgetData.originName)
            views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
            views.setTextViewText(R.id.widget_train_time, nextTrain.departureTime)
            
            views.setTextViewText(R.id.widget_train_label, "NEXT TRAIN")
            views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FFFF9999"))
            
            val platformText = if (nextTrain.platform.isNotEmpty()) {
                "Platform ${nextTrain.platform}"
            } else {
                "Platform TBD"
            }
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = "Train ${nextTrain.departureTime.replace(":", "")}"
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            Log.d(getLogTag(), "Set train data: ${widgetData.originName} -> ${widgetData.destinationName}, train at ${nextTrain.departureTime}")
        }
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        setStationBackground(views, widgetData.originId)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            Log.d(getLogTag(), "About to call updateAppWidget for compact widget $appWidgetId with station background for originId: ${widgetData.originId}")
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully updated compact widget $appWidgetId with schedule data")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error updating compact widget $appWidgetId", e)
        }
    }

    private fun loadTomorrowsFirstTrain(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, views: RemoteViews) {
        Log.d(getLogTag(), "Loading tomorrow's first train for compact widget $appWidgetId")
        
        val calendar = Calendar.getInstance()
        calendar.add(Calendar.DAY_OF_MONTH, DAY_OFFSET_TOMORROW)
        val tomorrowDate = BaseWidgetProvider.DATE_FORMAT.format(calendar.time)
        
        Log.d(getLogTag(), "Fetching trains for tomorrow: $tomorrowDate")
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        appWidgetManager.updateAppWidget(appWidgetId, views)
        
        // Cancel any existing job for this widget
        BaseWidgetProvider.activeJobs[appWidgetId]?.cancel()
        
        val job = BaseWidgetProvider.widgetScope.launch {
            try {
                Log.d(getLogTag(), "Calling API for tomorrow: originId=${widgetData.originId}, destinationId=${widgetData.destinationId}, date=$tomorrowDate, hour=$COMPACT_WIDGET_START_HOUR")
                val result = apiService.getRoutes(widgetData.originId, widgetData.destinationId, date = tomorrowDate, hour = COMPACT_WIDGET_START_HOUR)
                result.fold(
                    onSuccess = { scheduleData ->
                        Log.d(getLogTag(), "Tomorrow API success for compact widget $appWidgetId: ${scheduleData.routes.size} routes")
                        if (scheduleData.routes.isEmpty()) {
                            Log.w(getLogTag(), "Tomorrow API returned $EMPTY_ROUTES_COUNT routes for $tomorrowDate from ${widgetData.originId} to ${widgetData.destinationId}")
                        }
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsScheduleData(context, appWidgetManager, appWidgetId, widgetData, scheduleData.routes)
                        }
                    },
                    onFailure = { error ->
                        Log.e(getLogTag(), "Tomorrow API error for compact widget $appWidgetId: ${error.message}", error)
                        
                        CoroutineScope(Dispatchers.Main).launch {
                            showTomorrowsFallback(context, appWidgetManager, appWidgetId, widgetData)
                        }
                    }
                )
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception getting tomorrow's trains for compact widget $appWidgetId", e)
                
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
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        
        if (routes.isNotEmpty()) {
            val firstTrain = routes.first()
            
            views.setTextViewText(R.id.widget_train_time, firstTrain.departureTime)
            
            val platformText = if (firstTrain.platform.isNotEmpty()) {
                "Platform ${firstTrain.platform}"
            } else {
                "Platform TBD"
            }
            views.setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = "Train ${firstTrain.departureTime.replace(":", "")}"
            views.setTextViewText(R.id.widget_train_number, trainText)
            
            Log.d(getLogTag(), "Set tomorrow's train data: ${widgetData.originName} -> ${widgetData.destinationName}, train at ${firstTrain.departureTime}")
        } else {
            views.setTextViewText(R.id.widget_train_time, "No trains")
            views.setTextViewText(R.id.widget_platform, "Check schedule")
            views.setTextViewText(R.id.widget_train_number, "")
        }
        
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Successfully updated compact widget $appWidgetId with tomorrow's data")
    }

    override fun showTomorrowsFallback(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName)
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, "TOMORROW")
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, "Check schedule")
        views.setTextViewText(R.id.widget_train_number, "")
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        setStationBackground(views, widgetData.originId)
        setupClickIntents(context, views, appWidgetId, widgetData)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
        Log.d(getLogTag(), "Showed fallback tomorrow data for compact widget $appWidgetId")
    }
    
    private fun setStationBackground(views: RemoteViews, originId: String) {
        try {
            val imageResource = StationsData.getStationImageResource(originId)
            views.setImageViewResource(R.id.widget_station_background, imageResource)
            Log.d(getLogTag(), "Set station background for $originId -> $imageResource")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error setting station background for $originId", e)
            views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
        }
    }

    override fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        views.setTextViewText(R.id.widget_station_name, widgetData.originName.ifEmpty { "Error" })
        views.setTextViewText(R.id.widget_destination, widgetData.destinationName)
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, errorMessage)
        views.setTextViewText(R.id.widget_train_number, "Tap to retry")
        
        setStationBackground(views, widgetData.originId)
        
        setupClickIntents(context, views, appWidgetId, widgetData)
        try {
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Successfully showed error state for compact widget $appWidgetId: $errorMessage")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error showing error state for compact widget $appWidgetId", e)
        }
    }
    
    private fun setupClickIntents(context: Context, views: RemoteViews, appWidgetId: Int, widgetData: WidgetData) {
        if (widgetData.originId.isEmpty()) {
            val intent = Intent(context, CompactWidget2x2ConfigActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                context, appWidgetId, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container_compact, pendingIntent)
        } else {
            // Create deep link URI using betterrail scheme
            val deepLinkUri = "betterrail://widget?originId=${widgetData.originId}&destinationId=${widgetData.destinationId}"
            
            val openAppIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(deepLinkUri)).apply {
                setPackage(context.packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("widget_origin_id", widgetData.originId)
                putExtra("widget_destination_id", widgetData.destinationId)
                putExtra("widget_origin_name", widgetData.originName)
                putExtra("widget_destination_name", widgetData.destinationName)
                putExtra("from_widget", true)
            }
            
            val openAppPendingIntent = PendingIntent.getActivity(
                context, appWidgetId, openAppIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_container_compact, openAppPendingIntent)
        }
    }

    override fun configureWidget(context: Context, appWidgetId: Int) {
        Log.d(getLogTag(), "Compact widget $appWidgetId configured, starting initial load")
        val appWidgetManager = AppWidgetManager.getInstance(context)
        refreshWidget(context, appWidgetManager, appWidgetId)
        scheduleWidgetUpdates(context, appWidgetId)
    }
    
    override fun scheduleWidgetUpdates(context: Context, appWidgetId: Int) {
        val widgetData = WidgetPreferences.getWidgetData(context, appWidgetId)
        if (widgetData.originId.isNotEmpty() && widgetData.destinationId.isNotEmpty()) {
            WidgetUpdateWorker.scheduleWidgetUpdates(context, appWidgetId, widgetData.updateFrequencyMinutes)
            Log.d(getLogTag(), "Scheduled updates for compact widget $appWidgetId every ${widgetData.updateFrequencyMinutes} minutes")
        }
    }
}
