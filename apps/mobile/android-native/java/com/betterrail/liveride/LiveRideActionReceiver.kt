package com.betterrail.liveride

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.betterrail.alarm.ArrivalAlarmScheduler
import com.betterrail.modules.LiveRideNotificationModule

/**
 * Handles actions from the live ride notification (e.g. user tapping "Stop Ride").
 */
class LiveRideActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_STOP) return

        LiveRideNotifier.cancel(context)
        ArrivalAlarmScheduler.cancel(context)

        runCatching {
            context.getSharedPreferences(context.packageName + "_preferences", Context.MODE_PRIVATE)
                .edit()
                .remove("rideRoute")
                .remove("rideNotificationId")
                .remove("rideDelay")
                .remove("staleNotificationId")
                .apply()
        }

        LiveRideNotificationModule.notifyStopRequested()
    }

    companion object {
        const val ACTION_STOP = "com.betterrail.liveride.ACTION_STOP"
    }
}
