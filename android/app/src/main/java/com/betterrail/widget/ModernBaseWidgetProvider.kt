package com.betterrail.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.betterrail.R
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.data.StationsData
import com.betterrail.widget.repository.TrainScheduleRepository
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import com.betterrail.widget.repository.Resource
import com.betterrail.widget.lifecycle.WidgetCoroutineManager
import com.betterrail.widget.state.WidgetState
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

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        Log.d(getLogTag(), "onUpdate called for ${appWidgetIds.size} widgets")
        applicationContext = context.applicationContext
        
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

    override fun onDisabled(context: Context) {
        Log.d(getLogTag(), "onDisabled called - last widget removed")
        applicationContext = context.applicationContext
        
        // Clean up all data
        coroutineManager.launchInWidgetScope(-1) {
            try {
                scheduleRepository.clearAllCache()
                Log.d(getLogTag(), "Cleaned up all widget data")
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
                        is Resource.Loading -> {
                            Log.d(getLogTag(), "Loading schedule for widget $appWidgetId")
                            val state = WidgetState.Loading(
                                originName = StationsData.getStationName(context, widgetData.originId),
                                destinationName = StationsData.getStationName(context, widgetData.destinationId)
                            )
                            updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                        }
                        
                        is Resource.Success -> {
                            Log.d(getLogTag(), "Successfully loaded ${resource.data.routes.size} routes for widget $appWidgetId (cache: ${resource.fromCache})")
                            
                            if (resource.data.routes.isNotEmpty()) {
                                val state = WidgetState.Schedule(
                                    originName = StationsData.getStationName(context, widgetData.originId),
                                    destinationName = StationsData.getStationName(context, widgetData.destinationId),
                                    nextTrain = resource.data.routes.first(),
                                    upcomingTrains = resource.data.routes.drop(1)
                                )
                                updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                            } else {
                                // No trains available, try tomorrow's schedule
                                loadTomorrowSchedule(context, appWidgetManager, appWidgetId, widgetData)
                            }
                        }
                        
                        is Resource.Error -> {
                            Log.e(getLogTag(), "Error loading schedule for widget $appWidgetId: ${resource.message}")
                            val state = WidgetState.Error(
                                originName = StationsData.getStationName(context, widgetData.originId),
                                destinationName = StationsData.getStationName(context, widgetData.destinationId),
                                errorMessage = resource.message,
                                retryText = context.getString(R.string.tap_to_retry)
                            )
                            updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception in loadScheduleData for widget $appWidgetId", e)
                val state = WidgetState.Error(
                    originName = StationsData.getStationName(context, widgetData.originId),
                    destinationName = StationsData.getStationName(context, widgetData.destinationId),
                    errorMessage = e.message ?: "Unknown error",
                    retryText = context.getString(R.string.tap_to_retry)
                )
                updateWidgetUI(context, appWidgetManager, appWidgetId, state)
            }
        }
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
                val loadingState = WidgetState.TomorrowLoading(
                    originName = StationsData.getStationName(context, widgetData.originId),
                    destinationName = StationsData.getStationName(context, widgetData.destinationId)
                )
                updateWidgetUI(context, appWidgetManager, appWidgetId, loadingState)

                scheduleRepository.getTomorrowSchedule(appWidgetId, widgetData).collectLatest { resource ->
                    when (resource) {
                        is Resource.Success -> {
                            if (resource.data.routes.isNotEmpty()) {
                                val state = WidgetState.TomorrowSchedule(
                                    originName = StationsData.getStationName(context, widgetData.originId),
                                    destinationName = StationsData.getStationName(context, widgetData.destinationId),
                                    firstTrain = resource.data.routes.first()
                                )
                                updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                            } else {
                                val state = WidgetState.NoTrains(
                                    originName = StationsData.getStationName(context, widgetData.originId),
                                    destinationName = StationsData.getStationName(context, widgetData.destinationId)
                                )
                                updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                            }
                        }
                        
                        is Resource.Error -> {
                            val state = WidgetState.TomorrowFallback(
                                originName = StationsData.getStationName(context, widgetData.originId),
                                destinationName = StationsData.getStationName(context, widgetData.destinationId)
                            )
                            updateWidgetUI(context, appWidgetManager, appWidgetId, state)
                        }
                        
                        is Resource.Loading -> {
                            // Already handled above
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(getLogTag(), "Exception in loadTomorrowSchedule for widget $appWidgetId", e)
                val state = WidgetState.TomorrowFallback(
                    originName = StationsData.getStationName(context, widgetData.originId),
                    destinationName = StationsData.getStationName(context, widgetData.destinationId)
                )
                updateWidgetUI(context, appWidgetManager, appWidgetId, state)
            }
        }
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
        try {
            val views = renderWidgetState(context, state)
            setupRefreshClickIntent(context, views)
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(getLogTag(), "Updated widget $appWidgetId UI with state: ${state::class.simpleName}")
        } catch (e: Exception) {
            Log.e(getLogTag(), "Error updating widget $appWidgetId UI", e)
        }
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
}