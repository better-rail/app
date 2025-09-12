package com.betterrail.widget.lifecycle

import android.content.Context
import android.util.Log
import kotlinx.coroutines.*
import kotlin.coroutines.CoroutineContext
import kotlin.coroutines.EmptyCoroutineContext
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Lifecycle-aware coroutine manager for widgets.
 * Handles proper cleanup and prevents memory leaks.
 */
class WidgetCoroutineManager private constructor() {
    
    companion object {
        @Volatile
        private var INSTANCE: WidgetCoroutineManager? = null
        
        fun getInstance(): WidgetCoroutineManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: WidgetCoroutineManager().also { INSTANCE = it }
            }
        }
        
        private const val TAG = "WidgetCoroutineManager"
    }
    
    // Thread-safe storage for widget scopes
    private val widgetScopes = ConcurrentHashMap<Int, WidgetScope>()
    private val isShutdown = AtomicBoolean(false)
    
    /**
     * Represents a scoped coroutine environment for a specific widget
     */
    private class WidgetScope(val widgetId: Int) {
        private val supervisorJob = SupervisorJob()
        val scope = CoroutineScope(supervisorJob + Dispatchers.IO + CoroutineName("Widget-$widgetId"))
        private val isActive = AtomicBoolean(true)
        
        fun cancel(reason: String = "Widget cleanup") {
            if (isActive.compareAndSet(true, false)) {
                Log.d(TAG, "Cancelling scope for widget $widgetId: $reason")
                supervisorJob.cancel(CancellationException("Widget $widgetId: $reason"))
            }
        }
        
        fun isActive(): Boolean = isActive.get()
    }
    
    /**
     * Gets or creates a coroutine scope for a specific widget
     */
    fun getWidgetScope(widgetId: Int): CoroutineScope {
        if (isShutdown.get()) {
            throw IllegalStateException("WidgetCoroutineManager is shutdown")
        }
        
        return widgetScopes.computeIfAbsent(widgetId) { 
            Log.d(TAG, "Creating new coroutine scope for widget $widgetId")
            WidgetScope(it)
        }.scope
    }
    
    /**
     * Launches a coroutine in the widget's scope with automatic cleanup
     */
    fun launchInWidgetScope(
        widgetId: Int,
        context: CoroutineContext = EmptyCoroutineContext,
        start: CoroutineStart = CoroutineStart.DEFAULT,
        block: suspend CoroutineScope.() -> Unit
    ): Job {
        val scope = getWidgetScope(widgetId)
        return scope.launch(context, start, block)
    }
    
    /**
     * Cancels all coroutines for a specific widget
     */
    fun cancelWidget(widgetId: Int, reason: String = "Widget deleted") {
        widgetScopes.remove(widgetId)?.let { widgetScope ->
            Log.d(TAG, "Cancelling widget $widgetId: $reason")
            widgetScope.cancel(reason)
        }
    }
    
    /**
     * Cancels multiple widgets
     */
    fun cancelWidgets(widgetIds: IntArray, reason: String = "Widgets deleted") {
        Log.d(TAG, "Cancelling ${widgetIds.size} widgets: $reason")
        widgetIds.forEach { cancelWidget(it, reason) }
    }
    
    /**
     * Cancels all widget coroutines (usually on app shutdown or provider disabled)
     */
    fun cancelAllWidgets(reason: String = "All widgets cancelled") {
        Log.d(TAG, "Cancelling all ${widgetScopes.size} widget scopes: $reason")
        
        val scopes = widgetScopes.values.toList()
        widgetScopes.clear()
        
        scopes.forEach { it.cancel(reason) }
    }
    
    /**
     * Shuts down the manager completely
     */
    fun shutdown() {
        if (isShutdown.compareAndSet(false, true)) {
            Log.d(TAG, "Shutting down WidgetCoroutineManager")
            cancelAllWidgets("Manager shutdown")
        }
    }
    
    /**
     * Gets active widget count for monitoring
     */
    fun getActiveWidgetCount(): Int = widgetScopes.size
    
    /**
     * Checks if a widget has an active scope
     */
    fun isWidgetActive(widgetId: Int): Boolean {
        return widgetScopes[widgetId]?.isActive() == true
    }
    
    /**
     * Cleanup inactive widget scopes (housekeeping)
     */
    fun cleanupInactiveScopes() {
        val inactiveWidgets = mutableListOf<Int>()
        
        widgetScopes.forEach { (widgetId, widgetScope) ->
            if (!widgetScope.isActive()) {
                inactiveWidgets.add(widgetId)
            }
        }
        
        inactiveWidgets.forEach { widgetId ->
            Log.d(TAG, "Removing inactive scope for widget $widgetId")
            widgetScopes.remove(widgetId)
        }
        
        if (inactiveWidgets.isNotEmpty()) {
            Log.d(TAG, "Cleaned up ${inactiveWidgets.size} inactive widget scopes")
        }
    }
}

/**
 * Extension functions for easier usage
 */

/**
 * Launches a coroutine with automatic widget lifecycle management
 */
fun CoroutineScope.launchForWidget(
    widgetId: Int,
    context: CoroutineContext = EmptyCoroutineContext,
    start: CoroutineStart = CoroutineStart.DEFAULT,
    block: suspend CoroutineScope.() -> Unit
): Job {
    return WidgetCoroutineManager.getInstance().launchInWidgetScope(widgetId, context, start, block)
}

/**
 * Creates a widget-scoped coroutine scope
 */
fun widgetScope(widgetId: Int): CoroutineScope {
    return WidgetCoroutineManager.getInstance().getWidgetScope(widgetId)
}

/**
 * Executes a block with proper widget lifecycle handling
 */
suspend fun <T> withWidgetScope(
    widgetId: Int,
    block: suspend CoroutineScope.() -> T
): T {
    return withContext(widgetScope(widgetId).coroutineContext, block)
}