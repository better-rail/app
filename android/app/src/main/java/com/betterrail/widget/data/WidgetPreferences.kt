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
    
    /**
     * Migrates existing widget data to remove stored localized station names
     * so widgets can dynamically show names in the current language
     */
    fun migrateWidgetDataForLocalization(context: Context) {
        val allWidgetIds = getAllWidgetIds(context)
        var migratedCount = 0
        
        allWidgetIds.forEach { widgetId ->
            val widgetData = getWidgetData(context, widgetId)
            
            // If widget has stored station names, clear them to force dynamic lookup
            if (widgetData.originName.isNotEmpty() || widgetData.destinationName.isNotEmpty()) {
                val migratedData = widgetData.copy(
                    originName = "",
                    destinationName = ""
                )
                saveWidgetData(context, widgetId, migratedData)
                migratedCount++
                android.util.Log.d("WidgetPreferences", "Migrated widget $widgetId to use dynamic station names")
            }
        }
        
        if (migratedCount > 0) {
            android.util.Log.d("WidgetPreferences", "Migrated $migratedCount widgets for localization")
            // Force refresh all widgets after migration
            refreshAllWidgets(context)
        }
    }
    
    /**
     * Forces refresh of all widgets to pick up new localization
     */
    private fun refreshAllWidgets(context: Context) {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // Refresh 2x2 widgets
            val component2x2 = ComponentName(context, "com.betterrail.widget.CompactWidget2x2Provider")
            val widgetIds2x2 = appWidgetManager.getAppWidgetIds(component2x2)
            if (widgetIds2x2.isNotEmpty()) {
                val intent = android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds2x2)
                intent.component = component2x2
                context.sendBroadcast(intent)
                android.util.Log.d("WidgetPreferences", "Triggered refresh for ${widgetIds2x2.size} 2x2 widgets")
            }
            
            // Refresh 4x2 widgets  
            val component4x2 = ComponentName(context, "com.betterrail.widget.CompactWidget4x2Provider")
            val widgetIds4x2 = appWidgetManager.getAppWidgetIds(component4x2)
            if (widgetIds4x2.isNotEmpty()) {
                val intent = android.content.Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, widgetIds4x2)
                intent.component = component4x2
                context.sendBroadcast(intent)
                android.util.Log.d("WidgetPreferences", "Triggered refresh for ${widgetIds4x2.size} 4x2 widgets")
            }
            
        } catch (e: Exception) {
            android.util.Log.e("WidgetPreferences", "Error refreshing widgets", e)
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
