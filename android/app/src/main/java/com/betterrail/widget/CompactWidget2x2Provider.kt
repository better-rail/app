package com.betterrail.widget

import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.StationsData
import android.content.Context

class CompactWidget2x2Provider : CompactWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.compact.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.compact.ACTION_WIDGET_UPDATE"
    }
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getLayoutResource(): Int = R.layout.widget_compact_2x2
    override fun getWidgetContainerId(): Int = R.id.widget_container_compact
    override fun getLogTag(): String = "CompactWidget2x2Provider"
    override fun getWidgetType(): String = "widget2x2"
    override fun getConfigActivityClass(): Class<*> = CompactWidget2x2ConfigActivity::class.java

    override fun setupConfigurationViews(context: Context, views: RemoteViews) {
        views.setTextViewText(R.id.widget_station_name, context.getString(R.string.tap_to_configure))
        views.setTextViewText(R.id.widget_destination, context.getString(R.string.select_your_route))
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.platform_default))
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.train_default))
    }

    override fun setupLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.loading) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupScheduleViews(context: Context, views: RemoteViews, widgetData: WidgetData, nextTrain: com.betterrail.widget.data.WidgetTrainItem) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_train_time, nextTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FFFF9999"))
        
        val platformText = if (nextTrain.platform.isNotEmpty()) {
            context.getString(R.string.platform_number, nextTrain.platform)
        } else {
            context.getString(R.string.platform_default)
        }
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = context.getString(R.string.train_number, nextTrain.departureTime.replace(":", ""))
        views.setTextViewText(R.id.widget_train_number, trainText)
    }

    override fun setupErrorViews(context: Context, views: RemoteViews, widgetData: WidgetData, errorMessage: String) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_platform, errorMessage)
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.tap_to_retry))
    }

    override fun setupTomorrowsFallbackViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupTomorrowsLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_train_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupTomorrowsTrainViews(context: Context, views: RemoteViews, firstTrain: com.betterrail.widget.data.WidgetTrainItem) {
        views.setTextViewText(R.id.widget_train_time, firstTrain.departureTime)
        
        val platformText = if (firstTrain.platform.isNotEmpty()) {
            context.getString(R.string.platform_number, firstTrain.platform)
        } else {
            context.getString(R.string.platform_default)
        }
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = context.getString(R.string.train_number, firstTrain.departureTime.replace(":", ""))
        views.setTextViewText(R.id.widget_train_number, trainText)
    }

    override fun setupNoTrainsViews(context: Context, views: RemoteViews) {
        views.setTextViewText(R.id.widget_train_time, context.getString(R.string.no_trains))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun showUpcomingTrains(views: RemoteViews, upcomingTrains: List<com.betterrail.widget.data.WidgetTrainItem>) {
        // 2x2 widget doesn't show upcoming trains list
    }
    
    override fun clearUpcomingTrains(views: RemoteViews) {
        // 2x2 widget doesn't show upcoming trains list
    }
}
