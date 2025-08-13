package com.betterrail.widget.data

import android.content.Context
import android.content.SharedPreferences
import android.appwidget.AppWidgetManager
import android.content.ComponentName

object WidgetPreferences {
    private const val PREFS_NAME = "widget_prefs"
    private const val KEY_ORIGIN_ID = "origin_id_"
    private const val KEY_DESTINATION_ID = "destination_id_"
    private const val KEY_ORIGIN_NAME = "origin_name_"
    private const val KEY_DESTINATION_NAME = "destination_name_"
    private const val KEY_LABEL = "label_"
    private const val KEY_UPDATE_FREQUENCY = "update_frequency_"

    private fun getSharedPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveWidgetData(context: Context, appWidgetId: Int, widgetData: WidgetData) {
        val prefs = getSharedPreferences(context)
        prefs.edit()
            .putString(KEY_ORIGIN_ID + appWidgetId, widgetData.originId)
            .putString(KEY_DESTINATION_ID + appWidgetId, widgetData.destinationId)
            .putString(KEY_ORIGIN_NAME + appWidgetId, widgetData.originName)
            .putString(KEY_DESTINATION_NAME + appWidgetId, widgetData.destinationName)
            .putString(KEY_LABEL + appWidgetId, widgetData.label)
            .putInt(KEY_UPDATE_FREQUENCY + appWidgetId, widgetData.updateFrequencyMinutes)
            .apply()
    }

    fun getWidgetData(context: Context, appWidgetId: Int): WidgetData {
        val prefs = getSharedPreferences(context)
        return WidgetData(
            originId = prefs.getString(KEY_ORIGIN_ID + appWidgetId, "") ?: "",
            destinationId = prefs.getString(KEY_DESTINATION_ID + appWidgetId, "") ?: "",
            originName = prefs.getString(KEY_ORIGIN_NAME + appWidgetId, "") ?: "",
            destinationName = prefs.getString(KEY_DESTINATION_NAME + appWidgetId, "") ?: "",
            label = prefs.getString(KEY_LABEL + appWidgetId, "") ?: "",
            updateFrequencyMinutes = prefs.getInt(KEY_UPDATE_FREQUENCY + appWidgetId, 10) // Default to 10 minutes
        )
    }

    fun deleteWidgetData(context: Context, appWidgetId: Int) {
        val prefs = getSharedPreferences(context)
        prefs.edit()
            .remove(KEY_ORIGIN_ID + appWidgetId)
            .remove(KEY_DESTINATION_ID + appWidgetId)
            .remove(KEY_ORIGIN_NAME + appWidgetId)
            .remove(KEY_DESTINATION_NAME + appWidgetId)
            .remove(KEY_LABEL + appWidgetId)
            .remove(KEY_UPDATE_FREQUENCY + appWidgetId)
            .apply()
    }

    fun getAllWidgetIds(context: Context): List<Int> {
        val prefs = getSharedPreferences(context)
        val widgetIds = mutableSetOf<Int>()
        
        prefs.all.keys.forEach { key ->
            when {
                key.startsWith(KEY_ORIGIN_ID) -> {
                    val id = key.substring(KEY_ORIGIN_ID.length).toIntOrNull()
                    if (id != null) widgetIds.add(id)
                }
            }
        }
        
        return widgetIds.toList().sorted()
    }

    fun cleanupOrphanedWidgets(context: Context, validWidgetIds: IntArray) {
        val allStoredIds = getAllWidgetIds(context)
        val validIds = validWidgetIds.toSet()
        
        allStoredIds.forEach { storedId ->
            if (storedId !in validIds) {
                deleteWidgetData(context, storedId)
                android.util.Log.d("WidgetPreferences", "Cleaned up orphaned widget data for ID: $storedId")
            }
        }
    }
}

data class WidgetData(
    val originId: String = "",
    val destinationId: String = "",
    val originName: String = "",
    val destinationName: String = "",
    val label: String = "",
    val updateFrequencyMinutes: Int = 10
)
