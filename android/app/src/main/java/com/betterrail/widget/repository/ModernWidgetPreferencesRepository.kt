package com.betterrail.widget.repository

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import com.betterrail.widget.data.WidgetData
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first

/**
 * Modern DataStore-based widget preferences repository
 * Replaces SharedPreferences with type-safe, coroutine-friendly DataStore
 */
@Singleton
class ModernWidgetPreferencesRepository @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        private const val TAG = "ModernWidgetPreferencesRepository"
        private const val DATASTORE_NAME = "widget_preferences"
        
        // DataStore extension
        private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = DATASTORE_NAME)
        
        // Preference keys
        private fun originIdKey(widgetId: Int) = stringPreferencesKey("origin_id_$widgetId")
        private fun destinationIdKey(widgetId: Int) = stringPreferencesKey("destination_id_$widgetId")
        private fun originNameKey(widgetId: Int) = stringPreferencesKey("origin_name_$widgetId")
        private fun destinationNameKey(widgetId: Int) = stringPreferencesKey("destination_name_$widgetId")
        private fun labelKey(widgetId: Int) = stringPreferencesKey("label_$widgetId")
        private fun updateFrequencyKey(widgetId: Int) = intPreferencesKey("update_frequency_$widgetId")
    }

    private val dataStore = context.dataStore

    /**
     * Get widget data as Flow for reactive updates
     */
    fun getWidgetDataFlow(widgetId: Int): Flow<WidgetData?> {
        return dataStore.data
            .catch { exception ->
                Log.e(TAG, "Error reading widget data for $widgetId", exception)
                emit(emptyPreferences())
            }
            .map { preferences ->
                try {
                    val originId = preferences[originIdKey(widgetId)] ?: ""
                    val destinationId = preferences[destinationIdKey(widgetId)] ?: ""
                    
                    // Return null if widget is not configured
                    if (originId.isEmpty() || destinationId.isEmpty()) {
                        null
                    } else {
                        WidgetData(
                            originId = originId,
                            destinationId = destinationId,
                            originName = preferences[originNameKey(widgetId)] ?: "",
                            destinationName = preferences[destinationNameKey(widgetId)] ?: "",
                            label = preferences[labelKey(widgetId)] ?: "",
                            updateFrequencyMinutes = preferences[updateFrequencyKey(widgetId)] ?: 15
                        )
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing widget data for $widgetId", e)
                    null
                }
            }
    }

    /**
     * Get widget data synchronously (suspending)
     */
    suspend fun getWidgetData(widgetId: Int): WidgetData? {
        return try {
            getWidgetDataFlow(widgetId).first()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting widget data for $widgetId", e)
            null
        }
    }

    /**
     * Save widget configuration
     */
    suspend fun saveWidgetData(widgetId: Int, widgetData: WidgetData) {
        try {
            Log.d(TAG, "Saving widget data for $widgetId: ${widgetData.originName} -> ${widgetData.destinationName}")
            
            dataStore.edit { preferences ->
                preferences[originIdKey(widgetId)] = widgetData.originId
                preferences[destinationIdKey(widgetId)] = widgetData.destinationId
                preferences[originNameKey(widgetId)] = widgetData.originName
                preferences[destinationNameKey(widgetId)] = widgetData.destinationName
                preferences[labelKey(widgetId)] = widgetData.label
                preferences[updateFrequencyKey(widgetId)] = widgetData.updateFrequencyMinutes
            }
            
            Log.d(TAG, "Successfully saved widget data for $widgetId")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving widget data for $widgetId", e)
            throw e
        }
    }

    /**
     * Delete widget configuration
     */
    suspend fun deleteWidgetData(widgetId: Int) {
        try {
            Log.d(TAG, "Deleting widget data for $widgetId")
            
            dataStore.edit { preferences ->
                preferences.remove(originIdKey(widgetId))
                preferences.remove(destinationIdKey(widgetId))
                preferences.remove(originNameKey(widgetId))
                preferences.remove(destinationNameKey(widgetId))
                preferences.remove(labelKey(widgetId))
                preferences.remove(updateFrequencyKey(widgetId))
            }
            
            Log.d(TAG, "Successfully deleted widget data for $widgetId")
        } catch (e: Exception) {
            Log.e(TAG, "Error deleting widget data for $widgetId", e)
            throw e
        }
    }

    /**
     * Get all configured widget IDs
     */
    suspend fun getAllWidgetIds(): List<Int> {
        return try {
            dataStore.data.first().asMap().keys
                .filter { it.name.startsWith("origin_id_") }
                .mapNotNull { key ->
                    key.name.removePrefix("origin_id_").toIntOrNull()
                }
                .sorted()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting all widget IDs", e)
            emptyList()
        }
    }

    /**
     * Get all configured widgets as Flow
     */
    fun getAllWidgetsFlow(): Flow<List<Pair<Int, WidgetData>>> {
        return dataStore.data
            .catch { exception ->
                Log.e(TAG, "Error reading all widgets", exception)
                emit(emptyPreferences())
            }
            .map { preferences ->
                try {
                    val widgetIds = preferences.asMap().keys
                        .filter { it.name.startsWith("origin_id_") }
                        .mapNotNull { key ->
                            key.name.removePrefix("origin_id_").toIntOrNull()
                        }
                    
                    widgetIds.mapNotNull { widgetId ->
                        val originId = preferences[originIdKey(widgetId)] ?: ""
                        val destinationId = preferences[destinationIdKey(widgetId)] ?: ""
                        
                        if (originId.isNotEmpty() && destinationId.isNotEmpty()) {
                            val widgetData = WidgetData(
                                originId = originId,
                                destinationId = destinationId,
                                originName = preferences[originNameKey(widgetId)] ?: "",
                                destinationName = preferences[destinationNameKey(widgetId)] ?: "",
                                label = preferences[labelKey(widgetId)] ?: "",
                                updateFrequencyMinutes = preferences[updateFrequencyKey(widgetId)] ?: 15
                            )
                            widgetId to widgetData
                        } else {
                            null
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error parsing all widgets", e)
                    emptyList()
                }
            }
    }

    /**
     * Clean up orphaned widget data
     */
    suspend fun cleanupOrphanedWidgets(validWidgetIds: IntArray) {
        try {
            Log.d(TAG, "Cleaning up orphaned widgets. Valid IDs: ${validWidgetIds.contentToString()}")
            
            val allStoredIds = getAllWidgetIds()
            val validIds = validWidgetIds.toSet()
            
            dataStore.edit { preferences ->
                allStoredIds.forEach { storedId ->
                    if (storedId !in validIds) {
                        Log.d(TAG, "Removing orphaned widget data for ID: $storedId")
                        preferences.remove(originIdKey(storedId))
                        preferences.remove(destinationIdKey(storedId))
                        preferences.remove(originNameKey(storedId))
                        preferences.remove(destinationNameKey(storedId))
                        preferences.remove(labelKey(storedId))
                        preferences.remove(updateFrequencyKey(storedId))
                    }
                }
            }
            
            Log.d(TAG, "Successfully cleaned up orphaned widgets")
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up orphaned widgets", e)
            throw e
        }
    }

    /**
     * Check if widget is configured
     */
    suspend fun isWidgetConfigured(widgetId: Int): Boolean {
        return getWidgetData(widgetId) != null
    }

    /**
     * Update widget update frequency
     */
    suspend fun updateWidgetFrequency(widgetId: Int, frequencyMinutes: Int) {
        try {
            dataStore.edit { preferences ->
                preferences[updateFrequencyKey(widgetId)] = frequencyMinutes
            }
            Log.d(TAG, "Updated frequency for widget $widgetId to ${frequencyMinutes}min")
        } catch (e: Exception) {
            Log.e(TAG, "Error updating frequency for widget $widgetId", e)
            throw e
        }
    }

    /**
     * Batch update multiple widgets
     */
    suspend fun saveMultipleWidgets(widgetDataMap: Map<Int, WidgetData>) {
        try {
            dataStore.edit { preferences ->
                widgetDataMap.forEach { (widgetId, widgetData) ->
                    preferences[originIdKey(widgetId)] = widgetData.originId
                    preferences[destinationIdKey(widgetId)] = widgetData.destinationId
                    preferences[originNameKey(widgetId)] = widgetData.originName
                    preferences[destinationNameKey(widgetId)] = widgetData.destinationName
                    preferences[labelKey(widgetId)] = widgetData.label
                    preferences[updateFrequencyKey(widgetId)] = widgetData.updateFrequencyMinutes
                }
            }
            
            Log.d(TAG, "Successfully saved ${widgetDataMap.size} widgets in batch")
        } catch (e: Exception) {
            Log.e(TAG, "Error in batch save operation", e)
            throw e
        }
    }

    /**
     * Clear all widget data (for debugging/reset)
     */
    suspend fun clearAllData() {
        try {
            dataStore.edit { preferences ->
                preferences.clear()
            }
            Log.d(TAG, "Cleared all widget data")
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing all data", e)
            throw e
        }
    }
}