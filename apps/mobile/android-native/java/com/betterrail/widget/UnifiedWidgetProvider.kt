package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.res.Configuration
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
    override fun getActionRouteReversal(): String = defaultWidgetSize.actionRouteReversal
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

    fun getEffectiveDimensions(context: Context, appWidgetId: Int): Pair<Int, Int> {
        val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(appWidgetId)
        val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)

        val isPortrait = context.resources.configuration.orientation == Configuration.ORIENTATION_PORTRAIT
        val currentWidth = if (isPortrait) (if (minWidth > 0) minWidth else maxWidth) else (if (maxWidth > 0) maxWidth else minWidth)
        val currentHeight = if (isPortrait) (if (maxHeight > 0) maxHeight else minHeight) else (if (minHeight > 0) minHeight else maxHeight)
        return Pair(currentWidth, currentHeight)
    }

    fun getEffectiveWidgetSize(context: Context, appWidgetId: Int): WidgetSize {
        val (currentWidth, currentHeight) = getEffectiveDimensions(context, appWidgetId)
        return if (currentWidth == 0 && currentHeight == 0) {
            defaultWidgetSize
        } else {
            WidgetSize.getOptimalSize(currentWidth, currentHeight, defaultWidgetSize)
        }
    }

    /**
     * Render widget with responsive sizing
     */
    fun renderWidgetStateResponsive(context: Context, state: WidgetState, appWidgetId: Int): RemoteViews {
        val (currentWidth, currentHeight) = getEffectiveDimensions(context, appWidgetId)
        val optimalSize = if (currentWidth == 0 && currentHeight == 0) {
            defaultWidgetSize
        } else {
            WidgetSize.getOptimalSize(currentWidth, currentHeight, defaultWidgetSize)
        }

        Log.d(getLogTag(), "Widget $appWidgetId: ${WidgetSize.getGridInfo(currentWidth, currentHeight)}")

        return getRenderer(optimalSize).render(context, state, currentHeight)
    }
}
