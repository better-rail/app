package com.betterrail.widget.database.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.betterrail.widget.database.converters.TrainItemListConverter
import com.betterrail.widget.data.WidgetTrainItem

/**
 * Room entity for cached train schedule data with optimized indices
 */
@Entity(
    tableName = "train_schedules",
    indices = [
        // Primary index for widget-specific queries (most frequent)
        Index(value = ["widgetId"], name = "idx_widget_id"),
        
        // Index for cache cleanup operations (timestamp range queries)
        Index(value = ["cacheTimestamp"], name = "idx_cache_timestamp"),
        
        // Composite index for route-specific queries
        Index(value = ["originId", "destinationId"], name = "idx_route"),
        
        // Composite index for complex widget+route queries
        Index(value = ["widgetId", "originId", "destinationId"], name = "idx_widget_route"),
        
        // Index for date-specific queries (tomorrow schedules, etc.)
        Index(value = ["requestDate"], name = "idx_request_date")
    ]
)
@TypeConverters(TrainItemListConverter::class)
data class TrainScheduleEntity(
    @PrimaryKey
    val cacheKey: String, // Format: "widgetId_originId_destinationId_date"
    val widgetId: Int,
    val originId: String,
    val destinationId: String,
    val originName: String,
    val destinationName: String,
    val routes: List<WidgetTrainItem>,
    val cacheTimestamp: Long = System.currentTimeMillis(),
    val requestDate: String? = null, // For tomorrow's schedule
    val requestHour: String? = null
)