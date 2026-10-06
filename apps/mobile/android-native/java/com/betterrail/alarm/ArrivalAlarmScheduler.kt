package com.betterrail.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONObject

/** The ride's arrival alarm. Kept in shared preferences so a push or a reboot can move it while the app isn't running. */
data class ArrivalAlarmState(
    val rideId: String,
    /** Identifies the alarm the rider set; pushes carry it. A new lead time gets a new id. */
    val alarmId: String,
    val title: String,
    val stopText: String,
    /** When it rings, in ms */
    val fireDate: Long,
    /** False once it rang, or when the phone was off when it should have */
    val isScheduled: Boolean,
) {
    fun toJson(): String = JSONObject()
        .put("rideId", rideId)
        .put("alarmId", alarmId)
        .put("title", title)
        .put("stopText", stopText)
        .put("fireDate", fireDate)
        .put("isScheduled", isScheduled)
        .toString()

    companion object {
        fun fromJson(json: String): ArrivalAlarmState? = try {
            val obj = JSONObject(json)
            ArrivalAlarmState(
                rideId = obj.getString("rideId"),
                alarmId = obj.getString("alarmId"),
                title = obj.getString("title"),
                stopText = obj.getString("stopText"),
                fireDate = obj.getLong("fireDate"),
                isScheduled = obj.getBoolean("isScheduled"),
            )
        } catch (e: Exception) {
            null
        }
    }
}

object ArrivalAlarmStore {
    private const val PREFS = "arrival_alarm"
    private const val KEY = "state"

    fun load(context: Context): ArrivalAlarmState? =
        prefs(context).getString(KEY, null)?.let(ArrivalAlarmState::fromJson)

    fun save(context: Context, state: ArrivalAlarmState?) {
        // commit, not apply: the receiver and the push handler may run in a process that's about to die.
        if (state != null) {
            prefs(context).edit().putString(KEY, state.toJson()).commit()
        } else {
            prefs(context).edit().remove(KEY).commit()
        }
    }

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}

object ArrivalAlarmScheduler {
    private const val TAG = "ArrivalAlarm"

    // A date in the past rings right away, since the rider is already late.
    private const val MIN_DELAY_MS = 5_000L

    fun canScheduleExactAlarms(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(context).canScheduleExactAlarms()

    // Moves arrive on the native module thread while the alarm fires on the main one, so every
    // read-modify-write of the state goes through this object's lock.

    /** Schedules the alarm, replacing the current one. Throws when exact alarms aren't allowed. */
    @Synchronized
    fun schedule(context: Context, state: ArrivalAlarmState): ArrivalAlarmState {
        val scheduled = state.copy(
            fireDate = maxOf(state.fireDate, System.currentTimeMillis() + MIN_DELAY_MS),
            isScheduled = true,
        )

        // setAlarmClock: exact even in Doze, shows the alarm icon in the status bar, and lets the
        // receiver start the ringing service from the background.
        val info = AlarmManager.AlarmClockInfo(scheduled.fireDate, openAppIntent(context))
        alarmManager(context).setAlarmClock(info, fireIntent(context, scheduled.fireDate))

        ArrivalAlarmStore.save(context, scheduled)
        return scheduled
    }

    @Synchronized
    fun cancel(context: Context) {
        alarmManager(context).cancel(fireIntent(context, 0))
        ArrivalAlarmStore.save(context, null)
        ArrivalAlarmService.stopRinging()
    }

    /** Moves the alarm to the date a push asked for. Returns false when it couldn't. */
    @Synchronized
    fun move(context: Context, rideId: String, alarmId: String, fireDate: Long): Boolean {
        val state = ArrivalAlarmStore.load(context)
        // The rider turned the alarm off or changed it, so the push is stale.
        if (state == null || state.rideId != rideId || !state.alarmId.equals(alarmId, ignoreCase = true)) return true
        // It already rang, and moving it would ring it again.
        if (!state.isScheduled) return true

        return try {
            schedule(context, state.copy(fireDate = fireDate))
            true
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't move the arrival alarm", e)
            false
        }
    }

    /**
     * The stored alarm, or null when there's none. Revoking the exact alarm permission cancels the
     * pending alarm without telling the app, so a scheduled alarm that can no longer ring is dropped here.
     */
    @Synchronized
    fun current(context: Context): ArrivalAlarmState? {
        val state = ArrivalAlarmStore.load(context) ?: return null
        if (state.isScheduled && !canScheduleExactAlarms(context)) {
            ArrivalAlarmStore.save(context, null)
            return null
        }
        return state
    }

    /**
     * Called when the alarm goes off. Returns the alarm to ring, or null when it was cancelled or moved in the
     * meantime: a broadcast already on its way when the alarm moved carries the old date.
     */
    @Synchronized
    fun markRang(context: Context, fireDate: Long): ArrivalAlarmState? {
        val state = ArrivalAlarmStore.load(context) ?: return null
        if (!state.isScheduled || state.fireDate != fireDate) return null

        val rang = state.copy(isScheduled = false)
        ArrivalAlarmStore.save(context, rang)
        return rang
    }

    /** Alarms don't survive a reboot, and are dropped when the exact alarm permission is revoked. */
    @Synchronized
    fun restore(context: Context) {
        val state = ArrivalAlarmStore.load(context) ?: return
        if (!state.isScheduled) return

        if (state.fireDate <= System.currentTimeMillis()) {
            // The phone was off when it should have rung; ringing now would be too late to help.
            ArrivalAlarmStore.save(context, state.copy(isScheduled = false))
            return
        }

        try {
            schedule(context, state)
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't restore the arrival alarm", e)
        }
    }

    private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // One identity for every schedule, so a new one replaces the last. The extra tells a stale delivery apart.
    private fun fireIntent(context: Context, fireDate: Long): PendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        Intent(context, ArrivalAlarmReceiver::class.java)
            .setAction(ArrivalAlarmReceiver.ACTION_FIRE)
            .putExtra(ArrivalAlarmReceiver.EXTRA_FIRE_DATE, fireDate),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    fun openAppIntent(context: Context): PendingIntent? {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
        return PendingIntent.getActivity(
            context,
            0,
            launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
    }
}
