package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.workDataOf
import androidx.work.ListenableWorker
import androidx.work.Constraints
import androidx.work.NetworkType
import java.util.concurrent.TimeUnit
import android.util.Log

class WidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    
    companion object {
        private const val WORK_NAME_PREFIX = "widget_update_"
        
        fun scheduleWidgetUpdates(context: Context, appWidgetId: Int, frequencyMinutes: Int) {
            val workName = "$WORK_NAME_PREFIX$appWidgetId"
            
            // Cancel existing work for this widget
            WorkManager.getInstance(context).cancelUniqueWork(workName)
            
            val actualFrequency = frequencyMinutes
            
            // Use WorkManager with constraints for better battery and user experience
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED) // Only run when network is available
                .setRequiresBatteryNotLow(true) // Skip when battery is low - good for user experience
                .build()

            val updateRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                repeatInterval = actualFrequency.toLong(),
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            )
                .setInputData(
                    workDataOf(
                        "appWidgetId" to appWidgetId
                    )
                )
                .setConstraints(constraints)
                .build()
            
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                workName,
                ExistingPeriodicWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d("WidgetUpdateWorker", "Scheduled updates for widget $appWidgetId every $actualFrequency minutes")
        }
        
        fun cancelWidgetUpdates(context: Context, appWidgetId: Int) {
            val workName = "$WORK_NAME_PREFIX$appWidgetId"
            WorkManager.getInstance(context).cancelUniqueWork(workName)
            Log.d("WidgetUpdateWorker", "Cancelled updates for widget $appWidgetId")
        }
    }
    
    override suspend fun doWork(): ListenableWorker.Result {
        val appWidgetId = inputData.getInt("appWidgetId", BaseWidgetProvider.INVALID_POSITION)
        
        if (appWidgetId == BaseWidgetProvider.INVALID_POSITION) {
            Log.e("WidgetUpdateWorker", "Invalid widget ID")
            return ListenableWorker.Result.failure()
        }
        
        // Always update widgets regardless of screen state - widgets need to show current info
        val powerManager = applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        val screenOn = powerManager.isInteractive
        Log.d("WidgetUpdateWorker", "Screen is ${if (screenOn) "on" else "off"}, updating widget $appWidgetId anyway")
        
        return try {
            val currentTime = System.currentTimeMillis()
            val timeFormat = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            
            // Check cache staleness before deciding update strategy
            val widgetData = com.betterrail.widget.data.WidgetPreferences.getWidgetData(applicationContext, appWidgetId)
            val isCacheStale = com.betterrail.widget.cache.WidgetCacheManager.isCacheStale(
                applicationContext, appWidgetId, widgetData.originId, widgetData.destinationId
            )
            
            if (isCacheStale) {
                Log.d("WidgetUpdateWorker", "*** STALE CACHE DETECTED (>6h old) - FORCING API REFRESH *** at ${timeFormat.format(java.util.Date(currentTime))} for widget $appWidgetId")
            } else {
                Log.d("WidgetUpdateWorker", "*** WORKMANAGER API REFRESH *** at ${timeFormat.format(java.util.Date(currentTime))} for widget $appWidgetId (screen ${if (screenOn) "on" else "off"})")
            }
            
            // Use the centralized widget refresh manager for API refresh
            WidgetRefreshManager.forceRefreshWidget(applicationContext, appWidgetId)
            
            Log.d("WidgetUpdateWorker", "Successfully triggered update for widget $appWidgetId")
            ListenableWorker.Result.success()
        } catch (e: Exception) {
            Log.e("WidgetUpdateWorker", "Failed to update widget $appWidgetId", e)
            ListenableWorker.Result.retry()
        }
    }
}
