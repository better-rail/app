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
    }
}