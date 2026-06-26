package com.betterrail.widget.test

import com.betterrail.widget.data.WidgetScheduleData
import com.betterrail.widget.data.WidgetTrainItem
import java.text.SimpleDateFormat
import java.util.*

/**
 * Generates mock train schedules for testing widget refresh functionality
 */
object MockScheduleGenerator {
    private const val TAG = "MockScheduleGenerator"
    private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
    
    /**
     * Generate a mock schedule with trains every minute starting from current time
     */
    fun generateMockSchedule(originName: String, destinationName: String): WidgetScheduleData {
        val routes = mutableListOf<WidgetTrainItem>()
        val now = Calendar.getInstance()
        
        // Generate 20 trains, one every minute starting from next minute
        for (i in 1..20) {
            val trainTime = Calendar.getInstance().apply {
                add(Calendar.MINUTE, i)
            }
            
            val arrivalTime = Calendar.getInstance().apply {
                timeInMillis = trainTime.timeInMillis
                add(Calendar.MINUTE, 25) // 25 minute journey
            }
            
            val departureTimeStr = timeFormat.format(trainTime.time)
            val arrivalTimeStr = timeFormat.format(arrivalTime.time)
            
            // Vary train numbers and platforms for realism
            val trainNumber = (6000 + i * 2).toString()
            val platform = ((i % 4) + 1).toString()
            val delay = if (i % 5 == 0) (i % 3) else 0 // Some trains have delays
            
            routes.add(
                WidgetTrainItem(
                    departureTime = departureTimeStr,
                    arrivalTime = arrivalTimeStr,
                    platform = platform,
                    delay = delay,
                    isExchange = i % 7 == 0, // Every 7th train requires exchange
                    duration = "25m",
                    changesText = if (i % 7 == 0) "1 change" else "Direct",
                    trainNumber = trainNumber,
                    departureTimestamp = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault()).format(trainTime.time)
                )
            )
        }
        
        android.util.Log.d(TAG, "Generated mock schedule with ${routes.size} trains")
        android.util.Log.d(TAG, "Next train at: ${routes.firstOrNull()?.departureTime}")
        
        return WidgetScheduleData(
            routes = routes,
            originName = originName,
            destinationName = destinationName
        )
    }
    
    /**
     * Generate mock schedule for tomorrow (for testing tomorrow functionality)
     */
    fun generateTomorrowMockSchedule(originName: String, destinationName: String): WidgetScheduleData {
        val routes = mutableListOf<WidgetTrainItem>()
        
        // Start tomorrow at 5:30 AM
        val tomorrow = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 1)
            set(Calendar.HOUR_OF_DAY, 5)
            set(Calendar.MINUTE, 30)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        
        // Generate trains every 30 minutes for tomorrow
        for (i in 0..30) {
            val trainTime = Calendar.getInstance().apply {
                timeInMillis = tomorrow.timeInMillis
                add(Calendar.MINUTE, i * 30)
            }
            
            val arrivalTime = Calendar.getInstance().apply {
                timeInMillis = trainTime.timeInMillis
                add(Calendar.MINUTE, 25)
            }
            
            val departureTimeStr = timeFormat.format(trainTime.time)
            val arrivalTimeStr = timeFormat.format(arrivalTime.time)
            val trainNumber = (7000 + i * 3).toString()
            val platform = ((i % 3) + 1).toString()
            
            routes.add(
                WidgetTrainItem(
                    departureTime = departureTimeStr,
                    arrivalTime = arrivalTimeStr,
                    platform = platform,
                    delay = 0,
                    isExchange = i % 5 == 0,
                    duration = "25m",
                    changesText = if (i % 5 == 0) "1 change" else "Direct",
                    trainNumber = trainNumber,
                    departureTimestamp = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault()).format(trainTime.time)
                )
            )
        }
        
        android.util.Log.d(TAG, "Generated tomorrow mock schedule with ${routes.size} trains")
        
        return WidgetScheduleData(
            routes = routes,
            originName = originName,
            destinationName = destinationName
        )
    }
}