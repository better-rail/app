package com.betterrail.widget.state

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.WidgetTrainItem
import com.betterrail.widget.data.StationsData

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
        val destinationId: String,
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
        val destinationId: String,
        val originName: String,
        val destinationName: String,
        val firstTrain: WidgetTrainItem
    ) : WidgetState()
    
    data class NoTrains(
        val originId: String,
        val originName: String,
        val destinationName: String
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
        val views = RemoteViews(context.packageName, layoutResource)
        
        when (state) {
            is WidgetState.Configuration -> renderConfiguration(context, views, state)
            is WidgetState.Loading -> renderLoading(context, views, state)
            is WidgetState.Schedule -> renderSchedule(context, views, state)
            is WidgetState.Error -> renderError(context, views, state)
            is WidgetState.TomorrowFallback -> renderTomorrowFallback(context, views, state)
            is WidgetState.TomorrowLoading -> renderTomorrowLoading(context, views, state)
            is WidgetState.TomorrowSchedule -> renderTomorrowSchedule(context, views, state)
            is WidgetState.NoTrains -> renderNoTrains(context, views, state)
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
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        hideUpcomingTrains(views)
    }
    
    private fun renderSchedule(context: Context, views: RemoteViews, state: WidgetState.Schedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.nextTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
        
        val platformText = formatPlatform(context, state.nextTrain.platform)
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = if (state.nextTrain.trainNumber.isNotEmpty()) {
            "Train ${state.nextTrain.trainNumber}"
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        
        if (layoutResource == R.layout.widget_compact_4x2) {
            views.setTextViewText(R.id.widget_arrival_time, state.nextTrain.arrivalTime)
            showUpcomingTrains(views, state.upcomingTrains)
        }
        
        setStationBackground(views, state.originId)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
    }
    
    private fun renderError(context: Context, views: RemoteViews, state: WidgetState.Error) {
        views.setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "ERROR")
        views.setTextViewText(R.id.widget_train_label, "CONNECTION ERROR")
        views.setTextViewText(R.id.widget_platform, state.retryText)
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(views)
    }
    
    private fun renderLoading(context: Context, views: RemoteViews, state: WidgetState.Loading) {
        views.setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.loading) })
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, "LOADING")
        views.setTextViewText(R.id.widget_platform, "")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        views.setTextViewText(R.id.widget_loading_text, "Loading...")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(views)
    }
    
    private fun renderTomorrowFallback(context: Context, views: RemoteViews, state: WidgetState.TomorrowFallback) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "----")
        views.setTextViewText(R.id.widget_train_label, "NO SCHEDULE")
        views.setTextViewText(R.id.widget_platform, "Try again later")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(views)
    }
    
    private fun renderTomorrowLoading(context: Context, views: RemoteViews, state: WidgetState.TomorrowLoading) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextViewText(R.id.widget_platform, "Loading...")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
        views.setTextViewText(R.id.widget_loading_text, "Loading tomorrow...")
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(views)
    }
    
    private fun renderTomorrowSchedule(context: Context, views: RemoteViews, state: WidgetState.TomorrowSchedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.firstTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        
        val platformText = formatPlatform(context, state.firstTrain.platform)
        views.setTextViewText(R.id.widget_platform, platformText)
        
        val trainText = if (state.firstTrain.trainNumber.isNotEmpty()) {
            "Train ${state.firstTrain.trainNumber}"
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        
        if (layoutResource == R.layout.widget_compact_4x2) {
            views.setTextViewText(R.id.widget_arrival_time, state.firstTrain.arrivalTime)
        }
        
        setStationBackground(views, state.originId)
        
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        hideUpcomingTrains(views)
    }
    
    private fun renderNoTrains(context: Context, views: RemoteViews, state: WidgetState.NoTrains) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "----")
        views.setTextViewText(R.id.widget_train_label, "NO TRAINS")
        views.setTextViewText(R.id.widget_platform, "Check tomorrow")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        
        setStationBackground(views, state.originId)
        
        hideUpcomingTrains(views)
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
    
    private fun showUpcomingTrains(views: RemoteViews, upcomingTrains: List<WidgetTrainItem>) {
        if (layoutResource != R.layout.widget_compact_4x2) return
        
        val upcomingIds = listOf(
            Pair(R.id.widget_upcoming_row_1, Pair(R.id.widget_upcoming_train_1, R.id.widget_upcoming_arrival_1)),
            Pair(R.id.widget_upcoming_row_2, Pair(R.id.widget_upcoming_train_2, R.id.widget_upcoming_arrival_2)),
            Pair(R.id.widget_upcoming_row_3, Pair(R.id.widget_upcoming_train_3, R.id.widget_upcoming_arrival_3)),
            Pair(R.id.widget_upcoming_row_4, Pair(R.id.widget_upcoming_train_4, R.id.widget_upcoming_arrival_4)),
            Pair(R.id.widget_upcoming_row_5, Pair(R.id.widget_upcoming_train_5, R.id.widget_upcoming_arrival_5))
        )
        
        upcomingIds.forEachIndexed { index, (rowId, textIds) ->
            if (index < upcomingTrains.size) {
                val train = upcomingTrains[index]
                views.setViewVisibility(rowId, android.view.View.VISIBLE)
                views.setTextViewText(textIds.first, train.departureTime)
                views.setTextViewText(textIds.second, train.arrivalTime)
            } else {
                views.setViewVisibility(rowId, android.view.View.GONE)
            }
        }
    }
    
    private fun hideUpcomingTrains(views: RemoteViews) {
        if (layoutResource != R.layout.widget_compact_4x2) return
        
        val upcomingRowIds = listOf(
            R.id.widget_upcoming_row_1,
            R.id.widget_upcoming_row_2,
            R.id.widget_upcoming_row_3,
            R.id.widget_upcoming_row_4,
            R.id.widget_upcoming_row_5
        )
        
        upcomingRowIds.forEach { rowId ->
            views.setViewVisibility(rowId, android.view.View.GONE)
        }
    }
    
    private fun setStationBackground(views: RemoteViews, originId: String) {
        val backgroundResource = StationsData.getStationImageResource(originId)
        views.setImageViewResource(R.id.widget_station_background, backgroundResource)
    }
    
}

