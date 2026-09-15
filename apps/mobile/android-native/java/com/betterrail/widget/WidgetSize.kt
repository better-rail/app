package com.betterrail.widget

import com.betterrail.R

/**
 * Defines widget size configurations to eliminate boilerplate code
 */
enum class WidgetSize(
    val layoutRes: Int,
    val containerId: Int,
    val widgetType: String,
    val logTag: String,
    val configActivity: Class<*>,
    val actionRefresh: String,
    val actionWidgetUpdate: String,
    val actionRouteReversal: String,
) {
    COMPACT_2X2(
        layoutRes = R.layout.widget_compact_2x2,
        containerId = R.id.widget_container_compact,
        widgetType = "modern_widget2x2",
        logTag = "ModernCompactWidget2x2Provider",
        configActivity = CompactWidget2x2ConfigActivity::class.java,
        actionRefresh = "com.betterrail.widget.modern.compact.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact.ACTION_WIDGET_UPDATE",
        actionRouteReversal = "com.betterrail.widget.modern.compact.ACTION_ROUTE_REVERSAL"
    ),
    COMPACT_4X2(
        layoutRes = R.layout.widget_compact_4x2,
        containerId = R.id.widget_container_compact_4x2,
        widgetType = "modern_widget4x2",
        logTag = "ModernCompactWidget4x2Provider",
        configActivity = CompactWidget4x2ConfigActivity::class.java,
        actionRefresh = "com.betterrail.widget.modern.compact4x2.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact4x2.ACTION_WIDGET_UPDATE",
        actionRouteReversal = "com.betterrail.widget.modern.compact4x2.ACTION_ROUTE_REVERSAL"
    ),
    COMPACT_5X2(
        layoutRes = R.layout.widget_compact_4x2, // Reuse 4x2 layout for now
        containerId = R.id.widget_container_compact_4x2,
        widgetType = "modern_widget5x2",
        logTag = "ModernCompactWidget5x2Provider",
        configActivity = CompactWidget4x2ConfigActivity::class.java, // Reuse 4x2 config
        actionRefresh = "com.betterrail.widget.modern.compact5x2.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact5x2.ACTION_WIDGET_UPDATE",
        actionRouteReversal = "com.betterrail.widget.modern.compact5x2.ACTION_ROUTE_REVERSAL"
    ),
    COMPACT_4X3(
        layoutRes = R.layout.widget_compact_4x3,
        containerId = R.id.widget_container_compact_4x3,
        widgetType = "modern_widget4x3",
        logTag = "ModernCompactWidget4x3Provider",
        configActivity = CompactWidget4x3ConfigActivity::class.java,
        actionRefresh = "com.betterrail.widget.modern.compact4x3.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact4x3.ACTION_WIDGET_UPDATE",
        actionRouteReversal = "com.betterrail.widget.modern.compact4x3.ACTION_ROUTE_REVERSAL"
    );
    
    companion object {
        /**
         * Maximum number of upcoming train rows to display in 4x2 widgets.
         */
        const val MAX_UPCOMING_TRAINS = 5

        /**
         * Maximum number of upcoming train rows to display in 4x3 widgets.
         */
        const val MAX_UPCOMING_TRAINS_4X3 = 16
        
        /**
         * Grid-based layout selection (Android standard)
         */
        object GridThresholds {
            /** Standard Android grid cell width in dp (~70dp per cell) */
            const val CELL_WIDTH_DP = 70
            
            /** Standard Android grid cell height in dp */
            const val CELL_HEIGHT_DP = 70
            
            /** Grid width threshold for 4x2 layout */
            const val GRID_WIDTH_4X2 = 4
            
            /** Grid width threshold for 5x2 layout */
            const val GRID_WIDTH_5X2 = 5

            /** Grid height threshold for 4x3 layout (3+ rows in portrait evaluate to >= 4 cells) */
            const val GRID_HEIGHT_4X3 = 4
        }
        
        /**
         * Determine optimal widget size based on grid cells (more reliable than pixels)
         */
        fun getOptimalSize(widthDp: Int, heightDp: Int, defaultSize: WidgetSize? = null): WidgetSize {
            // Convert to grid cells using Android standard (~70dp per cell)
            val gridWidth = (widthDp + GridThresholds.CELL_WIDTH_DP / 2) / GridThresholds.CELL_WIDTH_DP
            val gridHeight = (heightDp + GridThresholds.CELL_HEIGHT_DP / 2) / GridThresholds.CELL_HEIGHT_DP

            // Retain 4x3 if height has not dropped below 3 rows and width is at least 4 columns
            if (defaultSize == COMPACT_4X3 && gridWidth >= GridThresholds.GRID_WIDTH_4X2 && gridHeight >= GridThresholds.GRID_HEIGHT_4X3) {
                return COMPACT_4X3
            }

            return when {
                gridWidth >= GridThresholds.GRID_WIDTH_4X2 && gridHeight >= GridThresholds.GRID_HEIGHT_4X3 -> COMPACT_4X3
                gridWidth >= GridThresholds.GRID_WIDTH_5X2 -> COMPACT_5X2
                gridWidth >= GridThresholds.GRID_WIDTH_4X2 -> COMPACT_4X2
                else -> COMPACT_2X2
            }
        }
        
        /**
         * Get grid dimensions for debugging
         */
        fun getGridInfo(widthDp: Int, heightDp: Int): String {
            val gridWidth = (widthDp + GridThresholds.CELL_WIDTH_DP / 2) / GridThresholds.CELL_WIDTH_DP
            val gridHeight = (heightDp + GridThresholds.CELL_HEIGHT_DP / 2) / GridThresholds.CELL_HEIGHT_DP
            val optimalSize = getOptimalSize(widthDp, heightDp)
            return "Grid: ${gridWidth}x${gridHeight} (${widthDp}x${heightDp}dp) → ${optimalSize.widgetType}"
        }
        
    }
}