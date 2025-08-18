package com.betterrail.widget

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.widget.state.WidgetState
import com.betterrail.widget.state.WidgetStateRenderer

/**
 * Unified widget provider that eliminates boilerplate by using WidgetSize configuration
 */
abstract class UnifiedWidgetProvider(
    private val widgetSize: WidgetSize
) : ModernBaseWidgetProvider() {

    // State-driven UI renderer configured for this widget size
    private val stateRenderer = WidgetStateRenderer(
        layoutResource = widgetSize.layoutRes,
        widgetType = widgetSize.widgetType
    )

    override fun getActionRefresh(): String = widgetSize.actionRefresh
    override fun getActionWidgetUpdate(): String = widgetSize.actionWidgetUpdate
    override fun getLayoutResource(): Int = widgetSize.layoutRes
    override fun getWidgetContainerId(): Int = widgetSize.containerId
    override fun getLogTag(): String = widgetSize.logTag
    override fun getWidgetType(): String = widgetSize.widgetType
    override fun getConfigActivityClass(): Class<*> = widgetSize.configActivity

    override fun renderWidgetState(context: Context, state: WidgetState): RemoteViews {
        return stateRenderer.render(context, state)
    }
}