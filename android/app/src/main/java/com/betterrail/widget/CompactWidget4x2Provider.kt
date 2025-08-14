package com.betterrail.widget

import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.StationsData
import android.content.Context

class CompactWidget4x2Provider : CompactWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.compact4x2.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.compact4x2.ACTION_WIDGET_UPDATE"
    }
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getLayoutResource(): Int = R.layout.widget_compact_4x2
    override fun getWidgetContainerId(): Int = R.id.widget_container_compact_4x2
    override fun getLogTag(): String = "CompactWidget4x2Provider"
    override fun getWidgetType(): String = "widget4x2"
    override fun getConfigActivityClass(): Class<*> = CompactWidget4x2ConfigActivity::class.java

    override fun setupConfigurationViews(context: Context, views: RemoteViews) {
        views.setTextViewText(R.id.widget_station_name, context.getString(R.string.tap_to_configure))
        views.setTextViewText(R.id.widget_destination, context.getString(R.string.select_your_route))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.platform_default))
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.train_default))
    }

    override fun setupLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.loading) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupScheduleViews(context: Context, views: RemoteViews, widgetData: WidgetData, nextTrain: com.betterrail.widget.data.WidgetTrainItem) {
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
    }

    override fun setupErrorViews(context: Context, views: RemoteViews, widgetData: WidgetData, errorMessage: String) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId).ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, errorMessage)
        views.setTextViewText(R.id.widget_train_number, context.getString(R.string.tap_to_retry))
    }

    override fun setupTomorrowsFallbackViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupTomorrowsLoadingViews(context: Context, views: RemoteViews, widgetData: WidgetData) {
        views.setTextViewText(R.id.widget_station_name, StationsData.getStationName(context, widgetData.originId))
        views.setTextViewText(R.id.widget_destination, StationsData.getStationName(context, widgetData.destinationId))
        views.setTextViewText(R.id.widget_next_train_time, "--:--")
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor("#FF9966CC"))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun setupTomorrowsTrainViews(context: Context, views: RemoteViews, firstTrain: com.betterrail.widget.data.WidgetTrainItem) {
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
    }

    override fun setupNoTrainsViews(context: Context, views: RemoteViews) {
        views.setTextViewText(R.id.widget_next_train_time, context.getString(R.string.no_trains))
        views.setTextViewText(R.id.widget_arrival_time, "--:--")
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
        views.setTextViewText(R.id.widget_train_number, "")
    }

    override fun showUpcomingTrains(views: RemoteViews, upcomingTrains: List<com.betterrail.widget.data.WidgetTrainItem>) {
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
    
    override fun clearUpcomingTrains(views: RemoteViews) {
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
}