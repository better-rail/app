package com.betterrail.widget.state

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.WidgetTrainItem

/**
 * Represents the possible states of a train widget
 */
sealed class WidgetState {
    data class Configuration(
        val message: String = "Tap to configure",
        val subtitle: String = "Select your route"
    ) : WidgetState()
    
    data class Loading(
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class Schedule(
        val originName: String,
        val destinationName: String,
        val nextTrain: WidgetTrainItem,
        val upcomingTrains: List<WidgetTrainItem> = emptyList()
    ) : WidgetState()
    
    data class Error(
        val originName: String,
        val destinationName: String,
        val errorMessage: String,
        val retryText: String = "Tap to retry"
    ) : WidgetState()
    
    data class TomorrowFallback(
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class TomorrowLoading(
        val originName: String,
        val destinationName: String
    ) : WidgetState()
    
    data class TomorrowSchedule(
        val originName: String,
        val destinationName: String,
        val firstTrain: WidgetTrainItem
    ) : WidgetState()
    
    data class NoTrains(
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
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.message)
            setTextViewText(R.id.widget_destination, state.subtitle)
            setTextViewText(R.id.widget_train_time, "--:--")
            setTextViewText(R.id.widget_platform, context.getString(R.string.platform_default))
            setTextViewText(R.id.widget_train_number, context.getString(R.string.train_default))
        }
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
        views.setImageViewResource(R.id.widget_station_background, R.drawable.assets_stationimages_betyehoshua)
    }
    
    private fun renderSchedule(context: Context, views: RemoteViews, state: WidgetState.Schedule) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.originName)
            setTextViewText(R.id.widget_destination, state.destinationName)
            setTextViewText(R.id.widget_train_time, state.nextTrain.departureTime)
            setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
            
            val platformText = formatPlatform(context, state.nextTrain.platform)
            setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = context.getString(R.string.train_number, state.nextTrain.departureTime.replace(":", ""))
            setTextViewText(R.id.widget_train_number, trainText)
        }
        
        views.applyColorScheme(WidgetColorScheme.NEXT_TRAIN)
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
    }
    
    private fun renderError(context: Context, views: RemoteViews, state: WidgetState.Error) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.error) })
            setTextViewText(R.id.widget_destination, state.destinationName)
            setTextViewText(R.id.widget_train_time, "--:--")
            setTextViewText(R.id.widget_platform, state.errorMessage)
            setTextViewText(R.id.widget_train_number, state.retryText)
        }
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
    }
    
    // ... other render methods
    
    private fun renderLoading(context: Context, views: RemoteViews, state: WidgetState.Loading) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.loading) })
            setTextViewText(R.id.widget_destination, state.destinationName)
            setTextViewText(R.id.widget_train_time, "--:--")
            setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
            setTextViewText(R.id.widget_train_number, "")
        }
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.VISIBLE)
    }
    
    private fun renderTomorrowFallback(context: Context, views: RemoteViews, state: WidgetState.TomorrowFallback) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.originName)
            setTextViewText(R.id.widget_destination, state.destinationName)
            setTextViewText(R.id.widget_train_time, "--:--")
            setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
            setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
            setTextViewText(R.id.widget_train_number, "")
        }
        views.applyColorScheme(WidgetColorScheme.TOMORROW)
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
    }
    
    private fun renderTomorrowLoading(context: Context, views: RemoteViews, state: WidgetState.TomorrowLoading) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_station_name, state.originName)
            setTextViewText(R.id.widget_destination, state.destinationName)
            setTextViewText(R.id.widget_train_time, "--:--")
            setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
            setTextViewText(R.id.widget_platform, context.getString(R.string.loading))
            setTextViewText(R.id.widget_train_number, "")
        }
        views.applyColorScheme(WidgetColorScheme.TOMORROW)
    }
    
    private fun renderTomorrowSchedule(context: Context, views: RemoteViews, state: WidgetState.TomorrowSchedule) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_train_time, state.firstTrain.departureTime)
            
            val platformText = formatPlatform(context, state.firstTrain.platform)
            setTextViewText(R.id.widget_platform, platformText)
            
            val trainText = context.getString(R.string.train_number, state.firstTrain.departureTime.replace(":", ""))
            setTextViewText(R.id.widget_train_number, trainText)
            setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        }
        views.applyColorScheme(WidgetColorScheme.TOMORROW)
        views.setViewVisibility(R.id.widget_loading_text, android.view.View.GONE)
    }
    
    private fun renderNoTrains(context: Context, views: RemoteViews, state: WidgetState.NoTrains) {
        views.applyTextUpdates {
            setTextViewText(R.id.widget_train_time, context.getString(R.string.no_trains))
            setTextViewText(R.id.widget_platform, context.getString(R.string.check_schedule))
            setTextViewText(R.id.widget_train_number, "")
        }
    }
    
    private fun formatPlatform(context: Context, platform: String): String {
        return if (platform.isNotEmpty()) {
            context.getString(R.string.platform_number, platform)
        } else {
            context.getString(R.string.platform_default)
        }
    }
}

/**
 * Extension functions for cleaner RemoteViews updates
 */
private inline fun RemoteViews.applyTextUpdates(block: RemoteViews.() -> Unit) {
    block()
}

private enum class WidgetColorScheme(val color: String) {
    NEXT_TRAIN("#FFFF9999"),
    TOMORROW("#FF9966CC"),
    ERROR("#FFFF6666")
}

private fun RemoteViews.applyColorScheme(scheme: WidgetColorScheme) {
    setTextColor(R.id.widget_train_label, android.graphics.Color.parseColor(scheme.color))
}