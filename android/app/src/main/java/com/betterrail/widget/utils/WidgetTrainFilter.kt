package com.betterrail.widget.utils

import android.util.Log
import com.betterrail.widget.data.WidgetTrainItem
import java.util.*

/**
 * Utility class for filtering train schedules in widgets.
 */
object WidgetTrainFilter {
    
    /**
     * Filters train routes to only show trains departing after the current time.
     */
    fun filterFutureTrains(routes: List<WidgetTrainItem>): List<WidgetTrainItem> {
        val currentTime = Calendar.getInstance()
        val currentHour = currentTime.get(Calendar.HOUR_OF_DAY)
        val currentMinute = currentTime.get(Calendar.MINUTE)
        val currentTimeInMinutes = currentHour * 60 + currentMinute
        
        Log.d("WidgetTrainFilter", "Current time: ${String.format("%02d:%02d", currentHour, currentMinute)} ($currentTimeInMinutes minutes from midnight)")
        
        return routes.filter { route ->
            try {
                // Parse the departure time (format: "HH:mm")
                val timeParts = route.departureTime.split(":")
                if (timeParts.size == 2) {
                    val trainHour = timeParts[0].toInt()
                    val trainMinute = timeParts[1].toInt()
                    val trainTimeInMinutes = trainHour * 60 + trainMinute
                    
                    val isFuture = trainTimeInMinutes > currentTimeInMinutes
                    isFuture
                } else {
                    Log.w("WidgetTrainFilter", "Invalid time format for route: ${route.departureTime}")
                    true // Keep train if we can't parse time
                }
            } catch (e: Exception) {
                Log.e("WidgetTrainFilter", "Error filtering train time: ${route.departureTime}", e)
                true // Keep train if error occurs
            }
        }.also { filteredRoutes ->
            Log.d("WidgetTrainFilter", "Filtered ${routes.size} trains -> ${filteredRoutes.size} future trains")
        }
    }
    
    /**
     * Gets the next train departure time, or null if no future trains.
     */
    fun getNextTrainDepartureTime(routes: List<WidgetTrainItem>): String? {
        val futureTrains = filterFutureTrains(routes)
        return futureTrains.firstOrNull()?.departureTime
    }
}
