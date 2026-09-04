package com.betterrail.widget.lifecycle

import android.app.Application
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.betterrail.widget.ModernCompactWidget2x2Provider
import com.betterrail.widget.ModernCompactWidget4x2Provider
import kotlinx.coroutines.*
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

/**
 * Manages widget coroutines and provides lifecycle-aware cleanup
 */
class WidgetLifecycleObserver private constructor(
    private val application: Application
) {

    companion object {
        private const val TAG = "WidgetLifecycleObserver"
        private const val CLEANUP_INTERVAL_MINUTES = 15L
        
        @Volatile
        private var INSTANCE: WidgetLifecycleObserver? = null
        
        fun initialize(application: Application): WidgetLifecycleObserver {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: WidgetLifecycleObserver(application).also { 
                    INSTANCE = it
                    it.startObserving()
                }
            }
        }
        
        fun getInstance(): WidgetLifecycleObserver? = INSTANCE
    }
    
    private val coroutineManager = WidgetCoroutineManager.getInstance()
    private var cleanupExecutor: ScheduledExecutorService? = null
    
    private fun startObserving() {
        startPeriodicCleanup()
        validateExistingWidgets()
        Log.d(TAG, "WidgetLifecycleObserver initialized")
    }
    
    fun onApplicationCreated() {
        Log.d(TAG, "Application created - initializing widget lifecycle management")
        validateExistingWidgets()
    }
    
    fun onApplicationDestroy() {
        Log.d(TAG, "Application destroyed - shutting down widget lifecycle management")
        stopPeriodicCleanup()
        coroutineManager.shutdown()
    }
    
    fun onLowMemory() {
        Log.d(TAG, "Low memory - performing widget cleanup")
        coroutineManager.cleanupInactiveScopes()
    }
    
    /**
     * Validates that all existing widgets still exist and cleans up orphaned scopes
     */
    private fun validateExistingWidgets() {
        try {
            val appWidgetManager = AppWidgetManager.getInstance(application)
            
            // Get all actual widget IDs from the system
            val actualWidgetIds = getAllActualWidgetIds(appWidgetManager)
            
            Log.d(TAG, "Found ${actualWidgetIds.size} actual widgets in system")
            
            // Cancel scopes for widgets that no longer exist
            val activeScopes = coroutineManager.getActiveWidgetCount()
            if (activeScopes > actualWidgetIds.size) {
                Log.d(TAG, "Found $activeScopes active scopes but only ${actualWidgetIds.size} actual widgets - cleaning up")
                // This would require extending CoroutineManager to expose active widget IDs
                // For now, we'll rely on periodic cleanup
                coroutineManager.cleanupInactiveScopes()
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error validating existing widgets", e)
        }
    }
    
    /**
     * Gets all actual widget IDs from all widget providers
     */
    private fun getAllActualWidgetIds(appWidgetManager: AppWidgetManager): Set<Int> {
        val allWidgetIds = mutableSetOf<Int>()
        
        try {
            // Add widgets from ModernCompactWidget2x2Provider
            val compact2x2Ids = appWidgetManager.getAppWidgetIds(
                ComponentName(application, ModernCompactWidget2x2Provider::class.java)
            )
            allWidgetIds.addAll(compact2x2Ids.toList())
            
            // Add widgets from ModernCompactWidget4x2Provider
            val compact4x2Ids = appWidgetManager.getAppWidgetIds(
                ComponentName(application, ModernCompactWidget4x2Provider::class.java)
            )
            allWidgetIds.addAll(compact4x2Ids.toList())
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting widget IDs", e)
        }
        
        return allWidgetIds
    }
    
    /**
     * Starts periodic cleanup of inactive widget scopes
     */
    private fun startPeriodicCleanup() {
        if (cleanupExecutor?.isShutdown != false) {
            cleanupExecutor = Executors.newSingleThreadScheduledExecutor { r ->
                Thread(r, "WidgetCleanup").apply {
                    isDaemon = true
                }
            }
            
            cleanupExecutor?.scheduleWithFixedDelay(
                {
                    try {
                        Log.d(TAG, "Running periodic widget cleanup")
                        coroutineManager.cleanupInactiveScopes()
                        validateExistingWidgets()
                    } catch (e: Exception) {
                        Log.e(TAG, "Error during periodic cleanup", e)
                    }
                },
                CLEANUP_INTERVAL_MINUTES,
                CLEANUP_INTERVAL_MINUTES,
                TimeUnit.MINUTES
            )
            
            Log.d(TAG, "Started periodic cleanup every $CLEANUP_INTERVAL_MINUTES minutes")
        }
    }
    
    /**
     * Stops periodic cleanup
     */
    private fun stopPeriodicCleanup() {
        cleanupExecutor?.let { executor ->
            executor.shutdown()
            try {
                if (!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                    executor.shutdownNow()
                }
            } catch (e: InterruptedException) {
                executor.shutdownNow()
                Thread.currentThread().interrupt()
            }
        }
        cleanupExecutor = null
        Log.d(TAG, "Stopped periodic cleanup")
    }
    
    /**
     * Called when widgets are deleted externally
     */
    fun onWidgetsDeleted(widgetIds: IntArray) {
        Log.d(TAG, "External notification: widgets deleted ${widgetIds.joinToString()}")
        coroutineManager.cancelWidgets(widgetIds, "External deletion")
    }
    
    /**
     * Called when all widgets of a type are disabled
     */
    fun onWidgetProviderDisabled() {
        Log.d(TAG, "Widget provider disabled - cancelling all widgets")
        coroutineManager.cancelAllWidgets("Provider disabled")
    }
    
    /**
     * Get monitoring information
     */
    fun getMonitoringInfo(): WidgetMonitoringInfo {
        return WidgetMonitoringInfo(
            activeWidgetScopes = coroutineManager.getActiveWidgetCount(),
            isCleanupRunning = cleanupExecutor?.isShutdown == false,
            isObserving = true // Simplified since we're not using ProcessLifecycleOwner
        )
    }
}

/**
 * Monitoring information for widget lifecycle management
 */
data class WidgetMonitoringInfo(
    val activeWidgetScopes: Int,
    val isCleanupRunning: Boolean,
    val isObserving: Boolean
)