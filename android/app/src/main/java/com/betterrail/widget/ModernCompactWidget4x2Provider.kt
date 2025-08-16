package com.betterrail.widget

import android.content.Context
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.state.WidgetState
import com.betterrail.widget.state.WidgetStateRenderer

/**
 * Modern 4x2 widget provider using Repository pattern and state management
 */
class ModernCompactWidget4x2Provider : ModernBaseWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.betterrail.widget.modern.compact4x2.ACTION_REFRESH"
        const val ACTION_WIDGET_UPDATE = "com.betterrail.widget.modern.compact4x2.ACTION_WIDGET_UPDATE"
        const val ACTION_REVERSE_ROUTE = "com.betterrail.widget.modern.compact4x2.ACTION_REVERSE_ROUTE"
    }
    
    // State-driven UI renderer with 4x2 layout
    private val stateRenderer = WidgetStateRenderer(
        layoutResource = R.layout.widget_compact_4x2,
        widgetType = "modern_widget4x2"
    )
    
    override fun getActionRefresh(): String = ACTION_REFRESH
    override fun getActionWidgetUpdate(): String = ACTION_WIDGET_UPDATE
    override fun getActionReverseRoute(): String = ACTION_REVERSE_ROUTE
    override fun getLayoutResource(): Int = R.layout.widget_compact_4x2
    override fun getWidgetContainerId(): Int = R.id.widget_container_compact_4x2
    override fun getStationNameIds(): List<Int> = listOf(R.id.widget_station_name, R.id.widget_destination)
    override fun getLogTag(): String = "ModernCompactWidget4x2Provider"
    override fun getWidgetType(): String = "modern_widget4x2"
    override fun getConfigActivityClass(): Class<*> = CompactWidget4x2ConfigActivity::class.java

    override fun renderWidgetState(context: Context, state: WidgetState): RemoteViews {
        return stateRenderer.render(context, state)
    }
}