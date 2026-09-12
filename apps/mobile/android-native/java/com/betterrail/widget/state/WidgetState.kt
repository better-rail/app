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
        val errorMessage: String
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
    
    private fun isMultiTrainLayout(): Boolean =
        layoutResource == R.layout.widget_compact_4x2 || layoutResource == R.layout.widget_compact_4x4

    private fun renderConfiguration(context: Context, views: RemoteViews, state: WidgetState.Configuration) {
        views.setTextViewText(R.id.widget_station_name, state.message)
        views.setTextViewText(R.id.widget_destination, state.subtitle)
        views.setTextViewText(getTrainTimeId(), "TAP")
        views.setTextViewText(R.id.widget_train_label, "TO CONFIGURE")
        views.setTextViewText(R.id.widget_platform, "")
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

        hideUpcomingTrains(context, views)
    }

    private fun renderSchedule(context: Context, views: RemoteViews, state: WidgetState.Schedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.nextTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_next_train_text))
        
        renderTrainDetails(context, views, state.nextTrain)
        
        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, state.nextTrain.arrivalTime)
            showUpcomingTrains(context, views, state.upcomingTrains)
        }
        
        setStationBackground(views, state.originId)
    }
    
    private fun renderError(context: Context, views: RemoteViews, state: WidgetState.Error) {
        views.setTextViewText(R.id.widget_station_name, state.originName.ifEmpty { context.getString(R.string.error) })
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), "--:--")
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.next_train))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_next_train_text))
        views.setTextViewText(R.id.widget_platform, context.getString(R.string.connection_error) + " ⋅ " + context.getString(R.string.tap_to_retry))
        views.setTextViewText(R.id.widget_train_number, "")
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

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
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

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
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

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
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

        setStationBackground(views, state.originId)

        hideUpcomingTrains(context, views)
    }

    private fun renderTomorrowSchedule(context: Context, views: RemoteViews, state: WidgetState.TomorrowSchedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.firstTrain.departureTime)
        views.setTextViewText(R.id.widget_train_label, context.getString(R.string.tomorrow))
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_tomorrow_text))
        
        renderTrainDetails(context, views, state.firstTrain)
        
        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, state.firstTrain.arrivalTime)
        }
        
        setStationBackground(views, state.originId)
        
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
        views.setViewVisibility(R.id.widget_dot_separator, android.view.View.GONE)

        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, "--:--")
        }

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, "--")
            views.setTextViewText(R.id.widget_train_num_val, "---")
        }

        setStationBackground(views, state.originId)

        hideUpcomingTrains(context, views)
    }

    private fun renderFutureSchedule(context: Context, views: RemoteViews, state: WidgetState.FutureSchedule) {
        views.setTextViewText(R.id.widget_station_name, state.originName)
        views.setTextViewText(R.id.widget_destination, state.destinationName)
        views.setTextViewText(getTrainTimeId(), state.firstTrain.departureTime)

        val labelText = context.resources.getQuantityString(R.plurals.upcoming_in_days, state.daysAway, state.daysAway)
        views.setTextViewText(R.id.widget_train_label, labelText)
        views.setTextColor(R.id.widget_train_label, context.getColor(R.color.widget_tomorrow_text)) // Purple color
        
        renderTrainDetails(context, views, state.firstTrain)
        
        if (isMultiTrainLayout()) {
            views.setTextViewText(R.id.widget_arrival_time, state.firstTrain.arrivalTime)
        }
        
        setStationBackground(views, state.originId)
        
        if (state.upcomingTrains.isNotEmpty()) {
            showUpcomingTrains(context, views, state.upcomingTrains)
        } else {
            hideUpcomingTrains(context, views)
        }
    }
    
    private fun renderTrainDetails(context: Context, views: RemoteViews, train: WidgetTrainItem) {
        val platformText = if (train.hasPlatform()) {
            context.getString(R.string.platform_number, train.platform)
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_platform, platformText)

        val trainText = if (train.trainNumber.isNotEmpty()) {
            context.getString(R.string.train_number, train.trainNumber)
        } else {
            ""
        }
        views.setTextViewText(R.id.widget_train_number, trainText)
        views.setViewVisibility(
            R.id.widget_dot_separator,
            if (trainText.isNotEmpty() && platformText.isNotEmpty() && layoutResource != R.layout.widget_compact_4x4) android.view.View.VISIBLE else android.view.View.GONE
        )

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_val, train.displayPlatform())
            views.setTextViewText(R.id.widget_train_num_val, train.displayTrainNumber())
        }
    }
    
    private fun getTrainTimeId(): Int {
        return when (layoutResource) {
            R.layout.widget_compact_2x2 -> R.id.widget_train_time
            R.layout.widget_compact_4x2,
            R.layout.widget_compact_4x4 -> R.id.widget_next_train_time
            else -> R.id.widget_train_time
        }
    }
    
    private fun showUpcomingTrains(context: Context, views: RemoteViews, upcomingTrains: List<WidgetTrainItem>) {
        if (!isMultiTrainLayout()) return

        // Set localized labels for upcoming trains section
        views.setTextViewText(R.id.widget_upcoming_label, context.getString(R.string.upcoming))
        views.setTextViewText(R.id.widget_arrival_label, context.getString(R.string.arrival_caps))

        if (layoutResource == R.layout.widget_compact_4x4) {
            views.setTextViewText(R.id.widget_platform_label, context.getString(R.string.platform_caps))
            views.setTextViewText(R.id.widget_train_num_label, context.getString(R.string.train_no_caps))
            views.setTextViewText(R.id.widget_header_depart, context.getString(R.string.depart_caps))
            views.setTextViewText(R.id.widget_header_arrive, context.getString(R.string.arrive_caps))
            views.setTextViewText(R.id.widget_header_duration, context.getString(R.string.duration_caps))
            views.setTextViewText(R.id.widget_header_platform, context.getString(R.string.platform_caps))
            views.setTextViewText(R.id.widget_header_train, context.getString(R.string.train_caps))
        }

        val resourcesHelper = UpcomingTrainResources.createForLayout(context, layoutResource)

        resourcesHelper.forEachRow { index, resources ->
            if (index < upcomingTrains.size) {
                val train = upcomingTrains[index]
                views.setViewVisibility(resources.rowId, android.view.View.VISIBLE)
                if (resources.dividerId != 0) {
                    views.setViewVisibility(resources.dividerId, android.view.View.VISIBLE)
                }
                views.setTextViewText(resources.trainTimeId, train.departureTime)
                views.setTextViewText(resources.arrivalTimeId, train.arrivalTime)
                if (resources.durationId != 0) {
                    val durationText = formatDuration(context, train)
                    views.setTextViewText(resources.durationId, durationText)
                }
                if (resources.platformId != 0) {
                    views.setTextViewText(resources.platformId, train.displayPlatform())
                }
                if (resources.trainNumberId != 0) {
                    views.setTextViewText(resources.trainNumberId, train.displayTrainNumber())
                }
            } else {
                views.setViewVisibility(resources.rowId, android.view.View.GONE)
                if (resources.dividerId != 0) {
                    views.setViewVisibility(resources.dividerId, android.view.View.GONE)
                }
            }
        }
    }

    private fun hideUpcomingTrains(context: Context, views: RemoteViews) {
        if (!isMultiTrainLayout()) return

        val resourcesHelper = UpcomingTrainResources.createForLayout(context, layoutResource)
        
        resourcesHelper.getRowIds().forEach { rowId ->
            views.setViewVisibility(rowId, android.view.View.GONE)
        }
        resourcesHelper.getDividerIds().forEach { dividerId ->
            if (dividerId != 0) {
                views.setViewVisibility(dividerId, android.view.View.GONE)
            }
        }
    }

    private fun formatDuration(context: Context, train: WidgetTrainItem): String {
        val totalMinutes = calculateMinutesBetween(train.departureTime, train.arrivalTime)
            ?: parseDurationToMinutes(train.duration)
            ?: return train.duration

        val hours = totalMinutes / 60
        val mins = totalMinutes % 60

        return when {
            hours > 0 -> context.getString(R.string.duration_hours_minutes, hours, mins)
            else -> context.getString(R.string.duration_minutes, mins)
        }
    }

    private fun parseDurationToMinutes(duration: String): Int? {
        val hours = HOURS_RE.find(duration)?.groupValues?.get(1)?.toIntOrNull() ?: 0
        val mins = MINS_RE.find(duration)?.groupValues?.get(1)?.toIntOrNull() ?: 0
        val total = hours * 60 + mins
        return total.takeIf { it > 0 }
    }

    companion object {
        private val HOURS_RE = Regex("""(\d+)h""")
        private val MINS_RE = Regex("""(\d+)m""")
    }

    private fun calculateMinutesBetween(from: String, to: String): Int? {
        return try {
            val fromParts = from.split(":").mapNotNull { it.toIntOrNull() }
            val toParts = to.split(":").mapNotNull { it.toIntOrNull() }
            if (fromParts.size == 2 && toParts.size == 2) {
                val start = fromParts[0] * 60 + fromParts[1]
                val end = toParts[0] * 60 + toParts[1]
                if (end >= start) end - start else end + 24 * 60 - start
            } else null
        } catch (_: Exception) {
            null
        }
    }
    
    private fun setStationBackground(views: RemoteViews, originId: String) {
        val backgroundResource = StationsData.getStationImageResource(originId)
        views.setImageViewResource(R.id.widget_station_background, backgroundResource)
    }
    
}

