package com.betterrail.liveride

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.betterrail.alarm.ArrivalAlarmScheduler
import com.betterrail.modules.LiveRideNotificationModule

class LiveRideActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_STOP) return

        LiveRideNotifier.cancel(context)
        ArrivalAlarmScheduler.cancel(context)

        val prefs = context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE)
        val rideId = prefs.getString("rideId", null)
        val baseUrl = prefs.getString("apiBaseUrl", null)
            ?.trim()
            ?.takeUnless { it.isEmpty() }
            ?: DEFAULT_API_BASE_URL
        prefs.edit()
            .remove("rideRoute")
            .remove("rideId")
            .putString("nativelyStoppedRideId", rideId)
            .apply()

        LiveRideNotificationModule.notifyStopRequested()

        if (!rideId.isNullOrBlank()) {
            EndRideWorker.enqueue(context, baseUrl, rideId)
        }
    }

    companion object {
        const val ACTION_STOP = "com.betterrail.liveride.ACTION_STOP"
        private const val DEFAULT_API_BASE_URL = "https://api.better-rail.co.il/api/v1"
    }
}
