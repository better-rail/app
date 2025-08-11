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
            
            // Use WorkManager with constraints for better battery and user experience
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED) // Only run when network is available
                .setRequiresBatteryNotLow(true) // Skip when battery is low
                .build()

            val updateRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                repeatInterval = frequencyMinutes.toLong(),
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
            
            Log.d("WidgetUpdateWorker", "Scheduled updates for widget $appWidgetId every $frequencyMinutes minutes (Android may enforce 15min minimum)")
        }
        
        fun cancelWidgetUpdates(context: Context, appWidgetId: Int) {
            val workName = "$WORK_NAME_PREFIX$appWidgetId"
            WorkManager.getInstance(context).cancelUniqueWork(workName)
            Log.d("WidgetUpdateWorker", "Cancelled updates for widget $appWidgetId")
        }
    }
    
    override suspend fun doWork(): ListenableWorker.Result {
        val appWidgetId = inputData.getInt("appWidgetId", 0)
        
        if (appWidgetId == 0) {
            Log.e("WidgetUpdateWorker", "Invalid widget ID")
            return ListenableWorker.Result.failure()
        }
        
        // Check if screen is on - skip update if screen is off to save battery
        val powerManager = applicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (!powerManager.isInteractive) {
            Log.d("WidgetUpdateWorker", "Screen is off, skipping widget $appWidgetId update to save battery")
            return ListenableWorker.Result.success()
        }
        
        return try {
            Log.d("WidgetUpdateWorker", "Updating widget $appWidgetId (screen is on)")
            
            val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
            
            // Determine which widget provider this widget ID belongs to
            val compactWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(applicationContext, CompactWidget2x2Provider::class.java)
            )
            val regularWidgetIds = appWidgetManager.getAppWidgetIds(
                ComponentName(applicationContext, TrainScheduleWidgetProvider::class.java)
            )
            
            val refreshIntent = when {
                compactWidgetIds.contains(appWidgetId) -> {
                    Log.d("WidgetUpdateWorker", "Widget $appWidgetId is a compact 2x2 widget")
                    Intent(applicationContext, CompactWidget2x2Provider::class.java).apply {
                        action = CompactWidget2x2Provider.ACTION_WIDGET_UPDATE
                    }
                }
                regularWidgetIds.contains(appWidgetId) -> {
                    Log.d("WidgetUpdateWorker", "Widget $appWidgetId is a regular 4x2 widget")
                    Intent(applicationContext, TrainScheduleWidgetProvider::class.java).apply {
                        action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                    }
                }
                else -> {
                    Log.w("WidgetUpdateWorker", "Widget $appWidgetId not found in either provider, defaulting to regular widget")
                    Intent(applicationContext, TrainScheduleWidgetProvider::class.java).apply {
                        action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
                    }
                }
            }
            
            refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            applicationContext.sendBroadcast(refreshIntent)
            
            Log.d("WidgetUpdateWorker", "Successfully triggered update for widget $appWidgetId")
            ListenableWorker.Result.success()
        } catch (e: Exception) {
            Log.e("WidgetUpdateWorker", "Failed to update widget $appWidgetId", e)
            ListenableWorker.Result.retry()
        }
    }
}