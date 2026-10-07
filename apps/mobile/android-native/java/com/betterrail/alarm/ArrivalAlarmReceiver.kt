package com.betterrail.alarm

import android.app.AlarmManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ArrivalAlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            ACTION_FIRE -> {
                val fireDate = intent.getLongExtra(EXTRA_FIRE_DATE, -1)
                if (ArrivalAlarmScheduler.markRang(context, fireDate) != null) {
                    // Start the service right away: the exact alarm only exempts this moment from the
                    // background foreground-service start restrictions.
                    ArrivalAlarmService.start(context)
                }
            }

            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED -> ArrivalAlarmScheduler.restore(context)
        }
    }

    companion object {
        const val ACTION_FIRE = "com.betterrail.alarm.ACTION_FIRE"
        const val EXTRA_FIRE_DATE = "fireDate"
    }
}
