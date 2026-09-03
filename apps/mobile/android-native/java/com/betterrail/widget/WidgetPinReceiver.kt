package com.betterrail.widget

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.betterrail.widget.data.WidgetData
import com.betterrail.widget.repository.ModernCacheRepository
import com.betterrail.widget.repository.ModernWidgetPreferencesRepository
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Success callback for requestPinAppWidget: saves the route from the intent extras so the
 * pinned widget is configured without opening the config activity.
 */
@AndroidEntryPoint
class WidgetPinReceiver : BroadcastReceiver() {

    @Inject
    lateinit var preferencesRepository: ModernWidgetPreferencesRepository

    @Inject
    lateinit var cacheRepository: ModernCacheRepository

    override fun onReceive(context: Context, intent: Intent) {
        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        val originId = intent.getStringExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_ORIGIN_ID).orEmpty()
        val destinationId = intent.getStringExtra(BaseWidgetConfigActivity.EXTRA_PREFILL_DESTINATION_ID).orEmpty()

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            Log.w(TAG, "Pin callback without a widget id")
            return
        }
        if (originId.isEmpty() || destinationId.isEmpty() || originId == destinationId) {
            Log.w(TAG, "Pin callback without a complete route, leaving widget $appWidgetId unconfigured")
            return
        }

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // A launcher that ran the config activity before this callback already saved
                // the user's choice; don't overwrite it.
                if (preferencesRepository.getWidgetData(appWidgetId) != null) {
                    Log.d(TAG, "Widget $appWidgetId already configured, skipping prefill")
                    return@launch
                }
                cacheRepository.clearWidgetCache(appWidgetId)
                preferencesRepository.saveWidgetData(
                    appWidgetId,
                    WidgetData(originId = originId, destinationId = destinationId)
                )
                val updateIntent = Intent(context, ModernCompactWidget4x2Provider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                }
                context.sendBroadcast(updateIntent)
                Log.d(TAG, "Widget $appWidgetId configured from pin request: $originId -> $destinationId")
                showHomeScreen(context)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to configure pinned widget $appWidgetId", e)
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        private const val TAG = "WidgetPinReceiver"

        fun showHomeScreen(context: Context) {
            try {
                val homeIntent = Intent(Intent.ACTION_MAIN)
                    .addCategory(Intent.CATEGORY_HOME)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(homeIntent)
            } catch (e: Exception) {
                Log.w(TAG, "Could not open the home screen", e)
            }
        }
    }
}
