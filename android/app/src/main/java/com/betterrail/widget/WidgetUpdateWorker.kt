package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.workDataOf
import androidx.work.ListenableWorker
import java.util.concurrent.TimeUnit
import android.util.Log

class WidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    
    companion object {
        private const val WORK_NAME_PREFIX = "widget_update_"
        
        fun scheduleWidgetUpdates(context: Context, appWidgetId: Int, frequencyMinutes: Int) {
            val workName = "$WORK_NAME_PREFIX$appWidgetId"
            
            // Cancel existing work for this widget
            WorkManager.getInstance(context).cancelUniqueWork(workName)
            
            // Schedule new periodic work
            val updateRequest = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(
                repeatInterval = frequencyMinutes.toLong(),
                repeatIntervalTimeUnit = TimeUnit.MINUTES
            )
                .setInputData(
                    workDataOf(
                        "appWidgetId" to appWidgetId
                    )
                )
                .build()
            
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                workName,
                ExistingPeriodicWorkPolicy.REPLACE,
                updateRequest
            )
            
            Log.d("WidgetUpdateWorker", "Scheduled updates for widget $appWidgetId every $frequencyMinutes minutes")
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
        
        return try {
            Log.d("WidgetUpdateWorker", "Updating widget $appWidgetId")
            
            val appWidgetManager = AppWidgetManager.getInstance(applicationContext)
            val widgetProvider = TrainScheduleWidgetProvider()
            
            // Trigger a refresh for this specific widget
            val refreshIntent = Intent(applicationContext, TrainScheduleWidgetProvider::class.java)
            refreshIntent.action = TrainScheduleWidgetProvider.ACTION_WIDGET_UPDATE
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