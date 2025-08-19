package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import com.betterrail.widget.state.WidgetState
import com.betterrail.widget.state.WidgetStateRenderer

/**
 * Unified widget provider that eliminates boilerplate by using WidgetSize configuration
 */
abstract class UnifiedWidgetProvider(
    private val defaultWidgetSize: WidgetSize
) : ModernBaseWidgetProvider() {

    // Cache renderers for different sizes
    private val renderers = mutableMapOf<WidgetSize, WidgetStateRenderer>()

    override fun getActionRefresh(): String = defaultWidgetSize.actionRefresh
    override fun getActionWidgetUpdate(): String = defaultWidgetSize.actionWidgetUpdate
    override fun getLayoutResource(): Int = defaultWidgetSize.layoutRes
    override fun getWidgetContainerId(): Int = defaultWidgetSize.containerId
    override fun getLogTag(): String = defaultWidgetSize.logTag
    override fun getWidgetType(): String = defaultWidgetSize.widgetType
    override fun getConfigActivityClass(): Class<*> = defaultWidgetSize.configActivity

    /**
     * Get renderer for specific widget size
     */
    private fun getRenderer(size: WidgetSize): WidgetStateRenderer {
        return renderers.getOrPut(size) {
            WidgetStateRenderer(
                layoutResource = size.layoutRes,
                widgetType = size.widgetType
            )
        }
    }

    override fun renderWidgetState(context: Context, state: WidgetState): RemoteViews {
        return getRenderer(defaultWidgetSize).render(context, state)
    }

    /**
     * Render widget with responsive sizing
     */
    fun renderWidgetStateResponsive(context: Context, state: WidgetState, appWidgetId: Int): RemoteViews {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        // Determine optimal size
        val optimalSize = if (minWidth == 0 && maxWidth == 0) {
            defaultWidgetSize
        } else {
            WidgetSize.getOptimalSize(minWidth, minHeight, maxWidth, maxHeight)
        }
        
        Log.d(getLogTag(), "Widget $appWidgetId: ${WidgetSize.getGridInfo(minWidth, minHeight, maxWidth, maxHeight)}")
        
        return getRenderer(optimalSize).render(context, state)
    }
}