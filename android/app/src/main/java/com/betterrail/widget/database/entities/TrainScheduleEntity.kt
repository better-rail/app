package com.betterrail.widget.database.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.betterrail.widget.database.converters.TrainItemListConverter
import com.betterrail.widget.data.WidgetTrainItem

/**
 * Room entity for cached train schedule data
 */
@Entity(tableName = "train_schedules")
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