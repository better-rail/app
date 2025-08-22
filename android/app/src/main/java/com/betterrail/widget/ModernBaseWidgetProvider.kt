package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.repository.TrainScheduleRepository
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import com.betterrail.widget.repository.Resource
import com.betterrail.widget.data.WidgetScheduleData
import com.betterrail.widget.lifecycle.WidgetCoroutineManager
import com.betterrail.widget.state.WidgetState
import com.betterrail.widget.scheduler.WidgetUpdateScheduler
import kotlinx.coroutines.flow.collectLatest
import android.util.Log
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent

/**
 * Modern widget provider base class using Repository pattern
 * Uses EntryPoint pattern for dependency access since AppWidgetProvider doesn't support @AndroidEntryPoint
 */
abstract class ModernBaseWidgetProvider : AppWidgetProvider() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface WidgetProviderEntryPoint {
        fun scheduleRepository(): TrainScheduleRepository
        fun preferencesRepository(): ModernWidgetPreferencesRepository
    }

    private var applicationContext: android.content.Context? = null

    // Repositories accessed via EntryPoint
    private val scheduleRepository: TrainScheduleRepository by lazy {
        val context = applicationContext ?: throw IllegalStateException("Application context not initialized")
        val hiltEntryPoint = EntryPointAccessors.fromApplication(
            context, WidgetProviderEntryPoint::class.java
        )
        hiltEntryPoint.scheduleRepository()
    }
    
    private val preferencesRepository: ModernWidgetPreferencesRepository by lazy {
        val context = applicationContext ?: throw IllegalStateException("Application context not initialized")
        val hiltEntryPoint = EntryPointAccessors.fromApplication(
            context, WidgetProviderEntryPoint::class.java
        )
        hiltEntryPoint.preferencesRepository()
    }
    
    private val coroutineManager = WidgetCoroutineManager.getInstance()
    
    companion object {
        private const val INVALID_WIDGET_ID = -1
    }

    // Abstract methods for subclasses to implement
    abstract fun getActionRefresh(): String
    abstract fun getActionWidgetUpdate(): String
    abstract fun getLayoutResource(): Int
    abstract fun getWidgetContainerId(): Int
    abstract fun getLogTag(): String
    abstract fun getWidgetType(): String
    abstract fun getConfigActivityClass(): Class<*>

    // Abstract UI methods for state-driven updates
    abstract fun renderWidgetState(context: Context, state: WidgetState): RemoteViews
    
    // Common method to render widget state with stale detection
    protected fun renderWidgetStateWithStaleDetection(context: Context, state: WidgetState, appWidgetId: Int): RemoteViews {
        val views = if (this is UnifiedWidgetProvider) {
            renderWidgetStateResponsive(context, state, appWidgetId)
        } else {
            renderWidgetState(context, state)
        }
        
        // Store displayed train time for stale detection
        when (state) {
            is WidgetState.Schedule -> {
                storeDisplayedTrainTime(context, state.nextTrain.departureTime)
            }
            is WidgetState.TomorrowSchedule -> {
                storeDisplayedTrainTime(context, state.firstTrain.departureTime)
            }
            is WidgetState.FutureSchedule -> {
                storeDisplayedTrainTime(context, state.firstTrain.departureTime)
            }
            else -> {
                // Other states don't show train times
            }
        }
        
        return views
    }
    
    private fun storeDisplayedTrainTime(context: Context, trainTime: String) {
        try {
            val sharedPrefs = context.getSharedPreferences("widget_display_state", Context.MODE_PRIVATE)
            sharedPrefs.edit()
                .putString("${getWidgetType()}_last_train_time", trainTime)
                .putLong("${getWidgetType()}_last_update", System.currentTimeMillis())
                .apply()
                
            Log.d(getLogTag(), "Stored displayed train time: $trainTime for widget type ${getWidgetType()}")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error storing displayed train time", e)
        }
    }

    override fun onEnabled(context: Context) {
        Log.d(getLogTag(), "onEnabled called - widget added")
        applicationContext = context.applicationContext
        
        // Ensure periodic updates are running
        WidgetUpdateScheduler.schedulePeriodicUpdates(context)
        super.onEnabled(context)
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d(getLogTag(), "onUpdate called for ${appWidgetIds.size} widgets")
        applicationContext = context.applicationContext
        
        // Ensure periodic updates are running whenever widgets update
        WidgetUpdateScheduler.schedulePeriodicUpdates(context)
        
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        applicationContext = context.applicationContext
        
        Log.d(getLogTag(), "onReceive: ${intent.action}")
        when (intent.action) {
            getActionRefresh() -> handleRefreshAction(context)
            getActionWidgetUpdate() -> handleWidgetUpdateAction(context, intent)
        }
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        Log.d(getLogTag(), "onDeleted called for ${appWidgetIds.size} widgets")
        applicationContext = context.applicationContext
        
        for (appWidgetId in appWidgetIds) {
            // Cancel widget coroutines
            coroutineManager.cancelWidget(appWidgetId, "Widget deleted")
            
            // Clear widget data using repository
            coroutineManager.launchInWidgetScope(appWidgetId) {
                try {
                    preferencesRepository.deleteWidgetData(appWidgetId)
                    scheduleRepository.clearCache(appWidgetId)
                    Log.d(getLogTag(), "Cleaned up data for deleted widget $appWidgetId")
                } catch (e: Exception) {
                    Log.e(getLogTag(), "Error cleaning up widget $appWidgetId", e)
                }
            }
        }
        super.onDeleted(context, appWidgetIds)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        Log.d(getLogTag(), "onAppWidgetOptionsChanged for widget $appWidgetId")
        
        // Extract dimensions
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT)
        
        // Update widget when size changes - responsive rendering will handle layout selection
        updateWidget(context, appWidgetManager, appWidgetId)
        
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }

    override fun onDisabled(context: Context) {
        Log.d(getLogTag(), "onDisabled called - all widgets removed")
        applicationContext = context.applicationContext
        
        // Only clean up cache data, keep periodic updates running in case onDisabled() 
        // was called incorrectly (Android bug where it triggers even when widgets remain)
        coroutineManager.launchInWidgetScope(-1) {
            try {
                scheduleRepository.clearAllCache()
                Log.d(getLogTag(), "Cleaned up all widget cache data")
            } catch (e: Exception) {
                Log.e(getLogTag(), "Error during cleanup", e)
            }
        }
        super.onDisabled(context)
    }

    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        coroutineManager.launchInWidgetScope(appWidgetId) {
            val widgetData = preferencesRepository.getWidgetData(appWidgetId)
            
            if (widgetData == null) {
                Log.d(getLogTag(), "Widget $appWidgetId not configured, showing configuration state")
                showConfigurationState(context, appWidgetManager, appWidgetId)
            } else {
                // Check if widget is showing stale data and refresh from cache if needed
                if (isWidgetShowingDepartedTrain(context, appWidgetId)) {
                    Log.d(getLogTag(), "Widget $appWidgetId showing departed train - refreshing from cache")
                }
                
                Log.d(getLogTag(), "Widget $appWidgetId configured, loading schedule data")
                loadScheduleData(context, appWidgetManager, appWidgetId, widgetData)
            }
        }
    }

    private fun loadScheduleData(
        context: Context, 
        appWidgetManager: AppWidgetManager, 
        appWidgetId: Int, 
        widgetData: WidgetData
    ) {
        coroutineManager.launchInWidgetScope(appWidgetId) {
            try {
                scheduleRepository.getSchedule(appWidgetId, widgetData).collectLatest { resource ->
                    when (resource) {
                        is Resource.Loading -> showLoadingState(context, appWidgetManager, appWidgetId, widgetData)
                        is Resource.Success -> handleSuccessfulSchedule(context, appWidgetManager, appWidgetId, widgetData, resource)
                        is Resource.Error -> {
                            Log.e(getLogTag(), "Error loading schedule for widget $appWidgetId: ${resource.message}")
                            showErrorState(context, appWidgetManager, appWidgetId, widgetData, resource.message)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception in loadScheduleData for widget $appWidgetId", e)
                showErrorState(context, appWidgetManager, appWidgetId, widgetData, e.message ?: "Unknown error")
            }
        }
    }

    private suspend fun handleSuccessfulSchedule(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        widgetData: WidgetData,
        resource: Resource.Success<WidgetScheduleData>
    ) {
        Log.d(getLogTag(), "Successfully loaded ${resource.data.routes.size} routes for widget $appWidgetId (cache: ${resource.fromCache})")
        
        if (resource.data.routes.isEmpty()) {
            loadTomorrowSchedule(context, appWidgetManager, appWidgetId, widgetData)
            return
        }
        
        val futureTrains = com.betterrail.widget.utils.WidgetTrainFilter.filterFutureTrains(resource.data.routes)
        if (futureTrains.isEmpty()) {
            Log.d(getLogTag(), "No future trains available for widget $appWidgetId, loading tomorrow's schedule")
            loadTomorrowSchedule(context, appWidgetManager, appWidgetId, widgetData)
            return
        }
        
        val nextTrain = futureTrains.first()
        val daysAway = getDaysFromToday(nextTrain.departureTimestamp)
        val originName = StationsData.getStationName(context, widgetData.originId)
        val destinationName = StationsData.getStationName(context, widgetData.destinationId)
        
        val state = when (daysAway) {
            0 -> {
                // Today's train
                WidgetState.Schedule(widgetData.originId, originName, destinationName, nextTrain, futureTrains.drop(1))
            }
            1 -> {
                // Tomorrow's train
                Log.d(getLogTag(), "Next train ${nextTrain.departureTime} detected as tomorrow's schedule")
                WidgetState.TomorrowSchedule(widgetData.originId, originName, destinationName, nextTrain, futureTrains.drop(1))
            }
            else -> {
                // Train is 2+ days away - show future schedule with "IN X DAYS" label
                Log.d(getLogTag(), "Next train ${nextTrain.departureTime} is $daysAway days away - showing future schedule")
                WidgetState.FutureSchedule(widgetData.originId, originName, destinationName, nextTrain, futureTrains.drop(1), daysAway)
            }
        }
        
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private suspend fun showLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        Log.d(getLogTag(), "Loading schedule for widget $appWidgetId")
        val state = WidgetState.Loading(
            widgetData.originId,
            StationsData.getStationName(context, widgetData.originId),
            StationsData.getStationName(context, widgetData.destinationId)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private suspend fun showErrorState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData, errorMessage: String) {
        val state = WidgetState.Error(
            widgetData.originId,
            StationsData.getStationName(context, widgetData.originId),
            StationsData.getStationName(context, widgetData.destinationId),
            errorMessage,
            context.getString(R.string.tap_to_retry)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private fun loadTomorrowSchedule(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        widgetData: WidgetData
    ) {
        coroutineManager.launchInWidgetScope(appWidgetId) {
            try {
                // Show tomorrow loading state first
                showTomorrowLoadingState(context, appWidgetManager, appWidgetId, widgetData)

                scheduleRepository.getTomorrowSchedule(appWidgetId, widgetData).collectLatest { resource ->
                    when (resource) {
                        is Resource.Success -> handleTomorrowScheduleSuccess(context, appWidgetManager, appWidgetId, widgetData, resource)
                        is Resource.Error -> showTomorrowFallbackState(context, appWidgetManager, appWidgetId, widgetData)
                        is Resource.Loading -> {
                            // Already handled above
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception in loadTomorrowSchedule for widget $appWidgetId", e)
                showTomorrowFallbackState(context, appWidgetManager, appWidgetId, widgetData)
            }
        }
    }

    private suspend fun handleTomorrowScheduleSuccess(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        widgetData: WidgetData,
        resource: Resource.Success<WidgetScheduleData>
    ) {
        if (resource.data.routes.isEmpty()) {
            showNoTrainsState(context, appWidgetManager, appWidgetId, widgetData)
            return
        }

        val originName = StationsData.getStationName(context, widgetData.originId)
        val destinationName = StationsData.getStationName(context, widgetData.destinationId)
        
        val state = WidgetState.TomorrowSchedule(
            widgetData.originId,
            originName,
            destinationName,
            resource.data.routes.first(),
            resource.data.routes.drop(1)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private suspend fun showTomorrowLoadingState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val state = WidgetState.TomorrowLoading(
            widgetData.originId,
            StationsData.getStationName(context, widgetData.originId),
            StationsData.getStationName(context, widgetData.destinationId)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private suspend fun showNoTrainsState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val state = WidgetState.NoTrains(
            widgetData.originId,
            StationsData.getStationName(context, widgetData.originId),
            StationsData.getStationName(context, widgetData.destinationId)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private suspend fun showTomorrowFallbackState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int, widgetData: WidgetData) {
        val state = WidgetState.TomorrowFallback(
            widgetData.originId,
            StationsData.getStationName(context, widgetData.originId),
            StationsData.getStationName(context, widgetData.destinationId)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
    }

    private fun showConfigurationState(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val state = WidgetState.Configuration(
            message = context.getString(R.string.tap_to_configure),
            subtitle = context.getString(R.string.select_your_route)
        )
        updateWidgetUI(context, appWidgetManager, appWidgetId, state)
        setupConfigurationClickIntent(context, appWidgetManager, appWidgetId)
    }

    private fun updateWidgetUI(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        state: WidgetState
    ) {
        coroutineManager.launchInWidgetScope(appWidgetId) {
            try {
                val views = renderWidgetStateWithStaleDetection(context, state, appWidgetId)
                
                // Set up click intent based on widget state
                when (state) {
                    is WidgetState.Configuration -> {
                        // Keep existing configuration click behavior
                        setupConfigurationClickIntent(context, appWidgetManager, appWidgetId)
                        return@launchInWidgetScope // Early return since setupConfigurationClickIntent handles the widget update
                    }
                    
                    is WidgetState.Error -> {
                        // For error state, use refresh behavior to retry
                        setupRefreshClickIntent(context, views)
                    }
                    
                    is WidgetState.Schedule -> {
                        // Standard deeplink behavior for schedule state
                        val widgetData = preferencesRepository.getWidgetData(appWidgetId)
                        if (widgetData != null) {
                            setupClickIntentsBase(
                                context = context,
                                views = views,
                                appWidgetId = appWidgetId,
                                widgetData = widgetData,
                                clickTargetId = getWidgetContainerId(),
                                useDeeplink = true,
                                deeplinkPath = getWidgetType()
                            )
                        } else {
                            setupRefreshClickIntent(context, views)
                        }
                    }
                    
                    else -> {
                        // For TomorrowSchedule, FutureSchedule and other states, get the complete widget data from preferences for deeplink
                        val widgetData = preferencesRepository.getWidgetData(appWidgetId)
                        if (widgetData != null) {
                            setupClickIntentsBase(
                                context = context,
                                views = views,
                                appWidgetId = appWidgetId,
                                widgetData = widgetData,
                                clickTargetId = getWidgetContainerId(),
                                useDeeplink = true,
                                deeplinkPath = getWidgetType()
                            )
                        } else {
                            // Fallback to refresh if no widget data found
                            setupRefreshClickIntent(context, views)
                        }
                    }
                }
                
                appWidgetManager.updateAppWidget(appWidgetId, views)
                Log.d(getLogTag(), "Updated widget $appWidgetId UI with state: ${state::class.simpleName}")
            } catch (e: Exception) {
                Log.e(getLogTag(), "Error updating widget $appWidgetId UI", e)
            }
        }
    }

    /**
     * Creates a reusable deeplink intent for widget navigation
     */
    protected fun createDeeplinkIntent(
        context: Context, 
        appWidgetId: Int, 
        widgetData: WidgetData,
        deeplinkPath: String = "widget"
    ): PendingIntent {
        val deepLinkUri = "betterrail://$deeplinkPath?originId=${widgetData.originId}&destinationId=${widgetData.destinationId}"
        
        val openAppIntent = Intent(Intent.ACTION_VIEW, android.net.Uri.parse(deepLinkUri)).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("widget_origin_id", widgetData.originId)
            putExtra("widget_destination_id", widgetData.destinationId)
            // Pass localized station names - both widget and app should use same locale context
            putExtra("widget_origin_name", StationsData.getStationName(context, widgetData.originId))
            putExtra("widget_destination_name", StationsData.getStationName(context, widgetData.destinationId))
            putExtra("from_widget", true)
            putExtra("widget_type", deeplinkPath)
        }
        
        return PendingIntent.getActivity(
            context, appWidgetId, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Sets up click intents for widgets - supports both deeplink and refresh modes
     */
    protected fun setupClickIntentsBase(
        context: Context, 
        views: RemoteViews, 
        appWidgetId: Int, 
        widgetData: WidgetData, 
        clickTargetId: Int,
        useDeeplink: Boolean = true,
        deeplinkPath: String = "widget"
    ) {
        if (widgetData.originId.isEmpty()) {
            // Subclasses will handle configuration intents
            return
        }
        
        val pendingIntent = if (useDeeplink) {
            createDeeplinkIntent(context, appWidgetId, widgetData, deeplinkPath)
        } else {
            // Set up tap-to-refresh for configured widgets
            val refreshIntent = Intent(context, this::class.java).apply {
                action = getActionRefresh()
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            PendingIntent.getBroadcast(
                context, appWidgetId, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
        
        views.setOnClickPendingIntent(clickTargetId, pendingIntent)
    }

    private fun setupRefreshClickIntent(context: Context, views: RemoteViews) {
        val intent = Intent(context, this::class.java).apply {
            action = getActionRefresh()
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(getWidgetContainerId(), pendingIntent)
    }


    private fun setupConfigurationClickIntent(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, getLayoutResource())
        val intent = Intent(context, getConfigActivityClass()).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        val pendingIntent = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(getWidgetContainerId(), pendingIntent)
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun handleRefreshAction(context: Context) {
        val appWidgetManager = AppWidgetManager.getInstance(context)
        val appWidgetIds = appWidgetManager.getAppWidgetIds(
            android.content.ComponentName(context, this::class.java)
        )
        Log.d(getLogTag(), "Manual refresh for ${appWidgetIds.size} widgets")
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun handleWidgetUpdateAction(context: Context, intent: Intent) {
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, INVALID_WIDGET_ID)
        if (appWidgetId != INVALID_WIDGET_ID) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            Log.d(getLogTag(), "Scheduled update for widget $appWidgetId")
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }

    /**
     * Check if widget is currently showing a departed train (time has passed)
     */
    private fun isWidgetShowingDepartedTrain(context: Context, appWidgetId: Int): Boolean {
        return try {
            // Get the last displayed train time from preferences
            val sharedPrefs = context.getSharedPreferences("widget_display_state", Context.MODE_PRIVATE)
            val lastDisplayedTime = sharedPrefs.getString("${getWidgetType()}_last_train_time", "")
            
            if (lastDisplayedTime.isNullOrEmpty()) return false
            
            // Get current time
            val currentTime = java.util.Calendar.getInstance()
            val currentMinutes = currentTime.get(java.util.Calendar.HOUR_OF_DAY) * 60 + currentTime.get(java.util.Calendar.MINUTE)
            
            // Parse displayed time
            val timeParts = lastDisplayedTime.split(":")
            if (timeParts.size >= 2) {
                val displayedMinutes = timeParts[0].toInt() * 60 + timeParts[1].toInt()
                
                // Train is considered departed if current time has passed the displayed time
                val isDeparted = currentMinutes > displayedMinutes
                
                if (isDeparted) {
                    val minutesPastDeparture = currentMinutes - displayedMinutes
                    Log.d(getLogTag(), "Widget $appWidgetId detected stale data: train $lastDisplayedTime departed ${minutesPastDeparture}min ago")
                }
                
                return isDeparted
            }
            
            false
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error checking if widget showing departed train", e)
            false
        }
    }

    /**
     * Calculate how many days away a train is from today
     */
    private fun getDaysFromToday(fullTimestamp: String): Int {
        return try {
            if (fullTimestamp.isEmpty()) return 0
            
            val today = java.util.Calendar.getInstance()
            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            val trainDate = dateFormat.parse(fullTimestamp) ?: return 0
            val trainCalendar = java.util.Calendar.getInstance().apply { time = trainDate }
            
            val todayDayOfYear = today.get(java.util.Calendar.DAY_OF_YEAR)
            val trainDayOfYear = trainCalendar.get(java.util.Calendar.DAY_OF_YEAR)
            val yearDiff = trainCalendar.get(java.util.Calendar.YEAR) - today.get(java.util.Calendar.YEAR)
            
            val daysAway = (yearDiff * 365) + (trainDayOfYear - todayDayOfYear)
            
            Log.d(getLogTag(), "Date check - Today: $todayDayOfYear, Train: $trainDayOfYear, Days away: $daysAway")
            
            return daysAway
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error parsing train timestamp: $fullTimestamp", e)
            0
        }
    }
    
    /**
     * Check if a train is for tomorrow by comparing the actual dates
     * Uses the full timestamp from the API response instead of just time
     */
    private fun isTrainForTomorrow(fullTimestamp: String): Boolean {
        return getDaysFromToday(fullTimestamp) == 1
    }
}