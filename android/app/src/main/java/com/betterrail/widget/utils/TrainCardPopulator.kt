package com.betterrail.widget.utils

import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetTrainItem
import android.util.Log

object TrainCardPopulator {
    
    private val trainItemIds = listOf(
        R.id.widget_train_item_1,
        R.id.widget_train_item_2,
        R.id.widget_train_item_3,
        R.id.widget_train_item_4,
        R.id.widget_train_item_5,
        R.id.widget_train_item_6,
        R.id.widget_train_item_7,
        R.id.widget_train_item_8,
        R.id.widget_train_item_9,
        R.id.widget_train_item_10
    )
    
    private val departureTimeIds = listOf(
        R.id.train_departure_time_1,
        R.id.train_departure_time_2,
        R.id.train_departure_time_3,
        R.id.train_departure_time_4,
        R.id.train_departure_time_5,
        R.id.train_departure_time_6,
        R.id.train_departure_time_7,
        R.id.train_departure_time_8,
        R.id.train_departure_time_9,
        R.id.train_departure_time_10
    )
    
    private val arrivalTimeIds = listOf(
        R.id.train_arrival_time_1,
        R.id.train_arrival_time_2,
        R.id.train_arrival_time_3,
        R.id.train_arrival_time_4,
        R.id.train_arrival_time_5,
        R.id.train_arrival_time_6,
        R.id.train_arrival_time_7,
        R.id.train_arrival_time_8,
        R.id.train_arrival_time_9,
        R.id.train_arrival_time_10
    )
    
    private val platformIds = listOf(
        R.id.train_platform_1,
        R.id.train_platform_2,
        R.id.train_platform_3,
        R.id.train_platform_4,
        R.id.train_platform_5,
        R.id.train_platform_6,
        R.id.train_platform_7,
        R.id.train_platform_8,
        R.id.train_platform_9,
        R.id.train_platform_10
    )
    
    private val delayIds = listOf(
        R.id.train_delay_1,
        R.id.train_delay_2,
        R.id.train_delay_3,
        R.id.train_delay_4,
        R.id.train_delay_5,
        R.id.train_delay_6,
        R.id.train_delay_7,
        R.id.train_delay_8,
        R.id.train_delay_9,
        R.id.train_delay_10
    )
    
    fun populateTrainCards(views: RemoteViews, routes: List<WidgetTrainItem>, maxRows: Int) {
        Log.d("TrainCardPopulator", "populateTrainCards: maxRows=$maxRows, trainItemIds.size=${trainItemIds.size}, routes.size=${routes.size}")
        val limitedRoutes = routes.take(minOf(maxRows, trainItemIds.size))
        Log.d("TrainCardPopulator", "populateTrainCards: will show ${limitedRoutes.size} train cards")
        
        // Hide all train cards first
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
        
        // Show and populate cards for available routes
        limitedRoutes.forEachIndexed { index, route ->
            val itemId = trainItemIds[index]
            Log.d("TrainCardPopulator", "Showing train card $index: itemId=$itemId, departureTime=${route.departureTime}")
            views.setViewVisibility(itemId, android.view.View.VISIBLE)
            
            // Set departure time
            views.setTextViewText(departureTimeIds[index], route.departureTime)
            
            // Set arrival time
            val arrivalText = if (route.arrivalTime.isNotEmpty()) {
                "arrives ${route.arrivalTime}"
            } else {
                "arrival time TBD"
            }
            views.setTextViewText(arrivalTimeIds[index], arrivalText)
            
            // Set platform
            val platformText = if (route.platform.isNotEmpty()) {
                "Plat. ${route.platform}"
            } else {
                "Plat. TBD"
            }
            views.setTextViewText(platformIds[index], platformText)
            
            // Set delay with proper visibility
            if (route.delay > 0) {
                views.setTextViewText(delayIds[index], "+${route.delay}m")
                views.setViewVisibility(delayIds[index], android.view.View.VISIBLE)
            } else {
                views.setViewVisibility(delayIds[index], android.view.View.GONE)
            }
        }
    }
    
    fun hideAllTrainCards(views: RemoteViews) {
        trainItemIds.forEach { itemId ->
            views.setViewVisibility(itemId, android.view.View.GONE)
        }
    }
}