package com.betterrail.widget.resources

import android.content.Context
import com.betterrail.widget.WidgetSize

/**
 * Generates resource IDs programmatically for upcoming train displays
 * Eliminates hardcoded resource ID lists and makes row count configurable
 */
data class UpcomingTrainResources(
    private val context: Context,
    private val maxRows: Int = WidgetSize.MAX_UPCOMING_TRAINS
) {
    
    /**
     * Get all row container resource IDs
     * Pattern: widget_upcoming_row_1, widget_upcoming_row_2, etc.
     */
    fun getRowIds(): List<Int> = (1..maxRows).map { index ->
        getResourceId("widget_upcoming_row_$index")
    }
    
    /**
     * Get all train departure time text view resource IDs  
     * Pattern: widget_upcoming_train_1, widget_upcoming_train_2, etc.
     */
    fun getTrainTimeIds(): List<Int> = (1..maxRows).map { index ->
        getResourceId("widget_upcoming_train_$index") 
    }
    
    /**
     * Get all train arrival time text view resource IDs
     * Pattern: widget_upcoming_arrival_1, widget_upcoming_arrival_2, etc.
     */
    fun getArrivalTimeIds(): List<Int> = (1..maxRows).map { index ->
        getResourceId("widget_upcoming_arrival_$index")
    }
    
    /**
     * Get all divider view resource IDs
     * Pattern: widget_upcoming_divider_1, widget_upcoming_divider_2, etc.
     */
    fun getDividerIds(): List<Int> = (1..maxRows).map { index ->
        getResourceId("widget_upcoming_divider_$index")
    }

    /**
     * Get complete resource mapping for a specific row index (1-based)
     */
    data class RowResources(
        val rowId: Int,
        val trainTimeId: Int, 
        val arrivalTimeId: Int,
        val durationId: Int = 0,
        val platformId: Int = 0,
        val trainNumberId: Int = 0,
        val dividerId: Int = 0
    )
    
    /**
     * Get resources for all rows as structured data
     */
    fun getAllRowResources(): List<RowResources> = (1..maxRows).map { index ->
        RowResources(
            rowId = getResourceId("widget_upcoming_row_$index"),
            trainTimeId = getResourceId("widget_upcoming_train_$index"),
            arrivalTimeId = getResourceId("widget_upcoming_arrival_$index"),
            durationId = getResourceId("widget_upcoming_duration_$index"),
            platformId = getResourceId("widget_upcoming_platform_$index"),
            trainNumberId = getResourceId("widget_upcoming_train_num_$index"),
            dividerId = getResourceId("widget_upcoming_divider_$index")
        )
    }
    
    /**
     * Execute action for each row with its resource IDs
     */
    fun forEachRow(action: (index: Int, resources: RowResources) -> Unit) {
        getAllRowResources().forEachIndexed { index, resources ->
            action(index, resources)
        }
    }
    
    /**
     * Helper to get resource ID by name
     */
    private fun getResourceId(resourceName: String): Int {
        val resourceId = context.resources.getIdentifier(
            resourceName, 
            "id", 
            context.packageName
        )
        return resourceId
    }
    
    companion object {
        /**
         * Create instance with default configuration from WidgetSize.MAX_UPCOMING_TRAINS
         */
        fun createDefault(context: Context) = UpcomingTrainResources(context, WidgetSize.MAX_UPCOMING_TRAINS)

        /**
         * Create instance appropriate for the given layout resource
         */
        fun createForLayout(context: Context, layoutResource: Int): UpcomingTrainResources {
            val maxRows = if (layoutResource == com.betterrail.R.layout.widget_compact_4x4) {
                WidgetSize.MAX_UPCOMING_TRAINS_4X4
            } else {
                WidgetSize.MAX_UPCOMING_TRAINS
            }
            return UpcomingTrainResources(context, maxRows)
        }
    }
}