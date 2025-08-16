package com.betterrail.widget

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.state.WidgetState
import com.betterrail.widget.state.WidgetStateRenderer

/**
 * Modern 2x2 widget provider using Repository pattern and state management
 */
class ModernCompactWidget2x2Provider : ModernBaseWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.modern.compact.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.modern.compact.ACTION_WIDGET_UPDATE"
        const val ACTION_REVERSE_ROUTE = "com.betterrail.widget.modern.compact.ACTION_REVERSE_ROUTE"
    }
    
    // State-driven UI renderer
    private val stateRenderer = WidgetStateRenderer(
        layoutResource = R.layout.widget_compact_2x2,
        widgetType = "modern_widget2x2"
    )
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getActionReverseRoute(): String = ACTION_REVERSE_ROUTE
    override fun getLayoutResource(): Int = R.layout.widget_compact_2x2
    override fun getWidgetContainerId(): Int = R.id.widget_container_compact
    override fun getStationNameIds(): List<Int> = listOf(R.id.widget_station_name, R.id.widget_destination)
    override fun getLogTag(): String = "ModernCompactWidget2x2Provider"
    override fun getWidgetType(): String = "modern_widget2x2"
    override fun getConfigActivityClass(): Class<*> = CompactWidget2x2ConfigActivity::class.java

    override fun renderWidgetState(context: Context, state: WidgetState): RemoteViews {
        return stateRenderer.render(context, state)
    }
}