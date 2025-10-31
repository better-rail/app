package com.betterrail.widget.state

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.WidgetTrainItem
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.resources.UpcomingTrainResources

/**
 * Represents the possible states of a train widget
 */
sealed class WidgetState {
    data class Configuration(
        val message: String = "Tap to configure",
        val subtitle: String = "Select your route"
    ) : WidgetState()
    
    data class Loading(
        val originId: String,
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class Schedule(
        val originId: String,
        val originName: String,
        val destinationName: String,
        val nextTrain: WidgetTrainItem,
        val upcomingTrains: List<WidgetTrainItem> = emptyList()
    ) : WidgetState()
    
    data class Error(
        val originId: String,
        val originName: String,
        val destinationName: String,
        val errorMessage: String,
        val retryText: String = "Tap to retry"
    ) : WidgetState()
    
    data class TomorrowFallback(
        val originId: String,
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class TomorrowLoading(
        val originId: String,
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class TomorrowSchedule(
        val originId: String,
        val originName: String,
        val destinationName: String,
        val firstTrain: WidgetTrainItem,
        val upcomingTrains: List<WidgetTrainItem> = emptyList()
    ) : WidgetState()
    
    data class NoTrains(
        val originId: String,
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class FutureSchedule(
        val originId: String,
        val originName: String,
        val destinationName: String,
        val firstTrain: WidgetTrainItem,
        val upcomingTrains: List<WidgetTrainItem> = emptyList(),
        val daysAway: Int
    ) : WidgetState()
}

/**
 * Converts widget states to RemoteViews updates
 */
class WidgetStateRenderer(
    private val layoutResource: Int,
    private val widgetType: String
) {
    
    fun render(context: Context, state: WidgetState): RemoteViews {
        val localeContext = com.betterrail.widget.utils.LocaleUtils.createLocaleContext(context)
        val views = RemoteViews(localeContext.packageName, layoutResource)

        // Apply RTL layout adjustments (direction, arrow rotation, etc.)
        com.betterrail.widget.utils.WidgetRTLHelper.applyRTLAdjustments(context, views, layoutResource)

        when (state) {
            is WidgetState.Configuration -> renderConfiguration(localeContext, views, state)
            is WidgetState.Loading -> renderLoading(localeContext, views, state)
            is WidgetState.Schedule -> renderSchedule(localeContext, views, state)
            is WidgetState.Error -> renderError(localeContext, views, state)
            is WidgetState.TomorrowFallback -> renderTomorrowFallback(localeContext, views, state)
            is WidgetState.TomorrowLoading -> renderTomorrowLoading(localeContext, views, state)
            is WidgetState.TomorrowSchedule -> renderTomorrowSchedule(localeContext, views, state)
            is WidgetState.NoTrains -> renderNoTrains(localeContext, views, state)
            is WidgetState.FutureSchedule -> renderFutureSchedule(localeContext, views, state)
        }

        return views
    }
    
    private fun renderConfiguration(context: Context, views: RemoteViews, state: WidgetState.Configuration) {
        views.setTextViewText(R.id.widget_station_name, state.message)
        views.setTextViewText(R.id.widget_destination, state.subtitle)
        views.setTextViewText(getTrainTimeId(), "TAP")
        views.setTextViewText(R.id.widget_train_label, "TO CONFIGURE")
        views.setTextViewText(R.id.widget_platform, "")
        views.setTextViewText(R.id.widget_train_number, "")
        hideUpcomingTrains(context, views)
    }
    
    private fun renderSchedule(context: Context, views: RemoteViews, state: WidgetState.Schedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.nextTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_next_train_text))
        
        val platformText = formatPlatform(context, state.nextTrain.platform)
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = if (state.nextTrain.trainNumber.isNotEmpty()) {
            context.getString(R.string.train_number, state.nextTrain.trainNumber)
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        
        if (layoutResource == R.layout.widget_compact_4x2) {
            views.setTextViewText(R.id.widget_arrival_time, state.nextTrain.arrivalTime)
            showUpcomingTrains(context, views, state.upcomingTrains)
        }
        
        setStationBackground(views, state.originId)
    }
    
    private fun renderError(context: Context, views: RemoteViews, state: WidgetState.Error) {
        views.setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "ERROR")
        views.setTextViewText(R.id.widget_train_label, "CONNECTION")
        views.setTextViewText(R.id.widget_platform, state.retryText)
        views.setTextViewText(R.id.widget_train_number, "")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(context, views)
    }
    
    private fun renderLoading(context: Context, views: RemoteViews, state: WidgetState.Loading) {
        views.setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.loading) })
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, "LOADING")
        views.setTextViewText(R.id.widget_platform, "")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(context, views)
    }
    
    private fun renderTomorrowFallback(context: Context, views: RemoteViews, state: WidgetState.TomorrowFallback) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, "NO SCHEDULE")
        views.setTextViewText(R.id.widget_platform, "Try again later")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(context, views)
    }
    
    private fun renderTomorrowLoading(context: Context, views: RemoteViews, state: WidgetState.TomorrowLoading) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_tomorrow_text))
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(context, views)
    }
    
    private fun renderTomorrowSchedule(context: Context, views: RemoteViews, state: WidgetState.TomorrowSchedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.firstTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_tomorrow_text))
        
        val platformText = formatPlatform(context, state.firstTrain.platform)
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = if (state.firstTrain.trainNumber.isNotEmpty()) {
            context.getString(R.string.train_number, state.firstTrain.trainNumber)
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        
        if (layoutResource == R.layout.widget_compact_4x2) {
            views.setTextViewText(R.id.widget_arrival_time, state.firstTrain.arrivalTime)
        }
        
        setStationBackground(views, state.originId)
        
        // Show upcoming trains for 4x2 widget (2x2 widget will ignore this)
        if (state.upcomingTrains.isNotEmpty()) {
            showUpcomingTrains(context, views, state.upcomingTrains)
        } else {
            hideUpcomingTrains(context, views)
        }
    }
    
    private fun renderNoTrains(context: Context, views: RemoteViews, state: WidgetState.NoTrains) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, "NO TRAINS")
        views.setTextViewText(R.id.widget_platform, "Check tomorrow")
        views.setTextViewText(R.id.widget_train_number, "")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(context, views)
    }
    
    private fun renderFutureSchedule(context: Context, views: RemoteViews, state: WidgetState.FutureSchedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.firstTrain.departureTime)

        val labelText = context.getString(R.string.upcoming_in_days, state.daysAway)
        views.setTextViewText(R.id.widget_train_label, labelText)
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_tomorrow_text)) // Purple color
        
        val platformText = formatPlatform(context, state.firstTrain.platform)
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = if (state.firstTrain.trainNumber.isNotEmpty()) {
            context.getString(R.string.train_number, state.firstTrain.trainNumber)
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        
        if (layoutResource == R.layout.widget_compact_4x2) {
            views.setTextViewText(R.id.widget_arrival_time, state.firstTrain.arrivalTime)
        }
        
        setStationBackground(views, state.originId)
        
        // Show upcoming trains for 4x2 widget
        if (state.upcomingTrains.isNotEmpty()) {
            showUpcomingTrains(context, views, state.upcomingTrains)
        } else {
            hideUpcomingTrains(context, views)
        }
    }
    
    private fun formatPlatform(context: Context, platform: String): String {
        return if (platform.isNotEmpty()) {
            context.getString(R.string.platform_number, platform)
        } else {
            context.getString(R.string.platform_default)
        }
    }
    
    private fun getTrainTimeId(): Int {
        return when (layoutResource) {
            R.layout.widget_compact_2x2 -> R.id.widget_train_time
            R.layout.widget_compact_4x2 -> R.id.widget_next_train_time
            else -> R.id.widget_train_time
        }
    }
    
    private fun showUpcomingTrains(context: Context, views: RemoteViews, upcomingTrains: List<WidgetTrainItem>) {
        if (layoutResource != R.layout.widget_compact_4x2) return

        // Set localized labels for upcoming trains section
        views.setTextViewText(R.id.widget_upcoming_label, context.getString(R.string.upcoming))
        views.setTextViewText(R.id.widget_arrival_label, context.getString(R.string.arrival_caps))

        val resourcesHelper = UpcomingTrainResources.createDefault(context)

        resourcesHelper.forEachRow { index, resources ->
            if (index < upcomingTrains.size) {
                val train = upcomingTrains[index]
                views.setViewVisibility(resources.rowId, android.view.View.VISIBLE)
                views.setTextViewText(resources.trainTimeId, train.departureTime)
                views.setTextViewText(resources.arrivalTimeId, train.arrivalTime)
            } else {
                views.setViewVisibility(resources.rowId, android.view.View.GONE)
            }
        }
    }

    private fun hideUpcomingTrains(context: Context, views: RemoteViews) {
        if (layoutResource != R.layout.widget_compact_4x2) return

        val resourcesHelper = UpcomingTrainResources.createDefault(context)
        
        resourcesHelper.getRowIds().forEach { rowId ->
            views.setViewVisibility(rowId, android.view.View.GONE)
        }
    }
    
    private fun setStationBackground(views: RemoteViews, originId: String) {
        val backgroundResource = StationsData.getStationImageResource(originId)
        views.setImageViewResource(R.id.widget_station_background, backgroundResource)
    }
    
}

