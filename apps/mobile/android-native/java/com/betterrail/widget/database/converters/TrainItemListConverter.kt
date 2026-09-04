package com.betterrail.widget.database.converters

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.betterrail.widget.data.WidgetTrainItem

/**
 * Type converter for storing list of WidgetTrainItem in Room database
 */
class TrainItemListConverter {
    private val gson = Gson()

    @TypeConverter
    fun fromTrainItemList(trainItems: List<WidgetTrainItem>): String {
        return gson.toJson(trainItems)
    }

    @TypeConverter
    fun toTrainItemList(trainItemsString: String): List<WidgetTrainItem> {
        val type = object : TypeToken<List<WidgetTrainItem>>() {}.type
        return gson.fromJson(trainItemsString, type) ?: emptyList()
    }
}