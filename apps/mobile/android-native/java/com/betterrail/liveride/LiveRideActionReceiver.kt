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

        val prefs = context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE)
        val rideId = prefs.getString("rideId", null)
        prefs.edit()
            .remove("rideRoute")
            .remove("rideId")
            .apply()

        if (!rideId.isNullOrBlank()) {
            Thread {
                runCatching {
                    val url = URL("https://api.better-rail.co.il/api/v1/ride")
                    val conn = (url.openConnection() as HttpURLConnection).apply {
                        requestMethod = "DELETE"
                        doOutput = true
                        setRequestProperty("Content-Type", "application/json")
                        connectTimeout = 10000
                        readTimeout = 10000
                    }
                    val json = JSONObject().put("rideId", rideId).toString()
                    conn.outputStream.use { os ->
                        os.write(json.toByteArray(Charsets.UTF_8))
                    }
                    conn.responseCode
                    conn.disconnect()
                }
            }.start()
        }

        LiveRideNotificationModule.notifyStopRequested()
    }

    companion object {
        const val ACTION_STOP = "com.betterrail.liveride.ACTION_STOP"
    }
}
