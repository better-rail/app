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
) {
    COMPACT_2X2(
        layoutRes = R.layout.widget_compact_2x2,
        containerId = R.id.widget_container_compact,
        widgetType = "modern_widget2x2",
        logTag = "ModernCompactWidget2x2Provider",
        configActivity = CompactWidget2x2ConfigActivity::class.java,
        actionRefresh = "com.betterrail.widget.modern.compact.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact.ACTION_WIDGET_UPDATE"
    ),
    COMPACT_4X2(
        layoutRes = R.layout.widget_compact_4x2,
        containerId = R.id.widget_container_compact_4x2,
        widgetType = "modern_widget4x2",
        logTag = "ModernCompactWidget4x2Provider",
        configActivity = CompactWidget4x2ConfigActivity::class.java,
        actionRefresh = "com.betterrail.widget.modern.compact4x2.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact4x2.ACTION_WIDGET_UPDATE"
    ),
    COMPACT_5X2(
        layoutRes = R.layout.widget_compact_4x2, // Reuse 4x2 layout for now
        containerId = R.id.widget_container_compact_4x2,
        widgetType = "modern_widget5x2",
        logTag = "ModernCompactWidget5x2Provider",
        configActivity = CompactWidget4x2ConfigActivity::class.java, // Reuse 4x2 config
        actionRefresh = "com.betterrail.widget.modern.compact5x2.ACTION_REFRESH",
        actionWidgetUpdate = "com.betterrail.widget.modern.compact5x2.ACTION_WIDGET_UPDATE"
    );
    
    companion object {
        /**
         * Maximum number of upcoming train rows to display in 4x2 widgets.
         * 
         * IMPORTANT: When changing this value, you MUST also update the XML layout file:
         * android/app/src/main/res/layout/widget_compact_4x2.xml
         * 
         * Add/remove LinearLayout entries with IDs following this pattern:
         * - widget_upcoming_row_[N]     (container)
         * - widget_upcoming_train_[N]   (departure time TextView)  
         * - widget_upcoming_arrival_[N] (arrival time TextView)
         * 
         * Where N ranges from 1 to MAX_UPCOMING_TRAINS.
         */
        const val MAX_UPCOMING_TRAINS = 5
        
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
        }
        
        /**
         * Determine optimal widget size based on grid cells (more reliable than pixels)
         */
        fun getOptimalSize(minWidth: Int, minHeight: Int, maxWidth: Int, maxHeight: Int): WidgetSize {
            // Use minimum dimensions for consistent detection
            val widthDp = minWidth
            val heightDp = minHeight
            
            // Convert to grid cells using Android standard (~70dp per cell)
            val gridWidth = (widthDp + GridThresholds.CELL_WIDTH_DP / 2) / GridThresholds.CELL_WIDTH_DP
            val gridHeight = (heightDp + GridThresholds.CELL_HEIGHT_DP / 2) / GridThresholds.CELL_HEIGHT_DP
            
            return when {
                gridWidth >= GridThresholds.GRID_WIDTH_5X2 -> COMPACT_5X2
                gridWidth >= GridThresholds.GRID_WIDTH_4X2 -> COMPACT_4X2
                else -> COMPACT_2X2
            }
        }
        
        /**
         * Get grid dimensions for debugging
         */
        fun getGridInfo(minWidth: Int, minHeight: Int, maxWidth: Int, maxHeight: Int): String {
            val gridWidth = (minWidth + GridThresholds.CELL_WIDTH_DP / 2) / GridThresholds.CELL_WIDTH_DP
            val gridHeight = (minHeight + GridThresholds.CELL_HEIGHT_DP / 2) / GridThresholds.CELL_HEIGHT_DP
            val optimalSize = getOptimalSize(minWidth, minHeight, maxWidth, maxHeight)
            return "Grid: ${gridWidth}x${gridHeight} (${minWidth}x${minHeight}dp) → ${optimalSize.widgetType}"
        }
        
    }
}