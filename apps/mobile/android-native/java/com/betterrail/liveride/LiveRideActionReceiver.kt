package com.betterrail.liveride

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.betterrail.alarm.ArrivalAlarmScheduler
import com.betterrail.modules.LiveRideNotificationModule
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class LiveRideActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_STOP) return

        LiveRideNotifier.cancel(context)
        ArrivalAlarmScheduler.cancel(context)

        val pendingResult = goAsync()
        val prefs = context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE)
        val rideId = prefs.getString("rideId", null)
        prefs.edit()
            .remove("rideRoute")
            .remove("rideId")
            .putString("nativelyStoppedRideId", rideId)
            .apply()

        LiveRideNotificationModule.notifyStopRequested()

        if (!rideId.isNullOrBlank()) {
            Thread {
                try {
                    deleteRideOnServer(context, rideId)
                } finally {
                    pendingResult.finish()
                }
            }.start()
        } else {
            pendingResult.finish()
        }
    }

    private fun deleteRideOnServer(context: Context, rideId: String) {
        runCatching {
            val prefs = context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE)
            val baseUrl = prefs.getString("apiBaseUrl", null)
                ?.trim()
                ?.takeUnless { it.isEmpty() }
                ?: DEFAULT_API_BASE_URL
            val conn = (URL("$baseUrl/ride").openConnection() as HttpURLConnection).apply {
                requestMethod = "DELETE"
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 10_000
                readTimeout = 10_000
            }
            conn.outputStream.use { os ->
                os.write(JSONObject().put("rideId", rideId).toString().toByteArray(Charsets.UTF_8))
            }
            conn.responseCode
            conn.disconnect()
        }
    }

    companion object {
        const val ACTION_STOP = "com.betterrail.liveride.ACTION_STOP"
        private const val DEFAULT_API_BASE_URL = "https://api.better-rail.co.il/api/v1"
    }
}
