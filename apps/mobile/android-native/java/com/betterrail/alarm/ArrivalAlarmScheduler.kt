package com.betterrail.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/** One stop the rider gets off: a transfer or the destination. */
data class ArrivalAlarmStop(
    /** The train the rider gets off, by its index in the route. Pushes refer to stops by it. */
    val train: Int,
    val title: String,
    /** When it rings, in ms */
    val fireDate: Long,
    /** False once it rang, or when the phone was off when it should have */
    val isScheduled: Boolean,
) {
    fun toJson(): JSONObject = JSONObject()
        .put("train", train)
        .put("title", title)
        .put("fireDate", fireDate)
        .put("isScheduled", isScheduled)

    companion object {
        fun fromJson(obj: JSONObject) = ArrivalAlarmStop(
            train = obj.getInt("train"),
            title = obj.getString("title"),
            fireDate = obj.getLong("fireDate"),
            isScheduled = obj.getBoolean("isScheduled"),
        )
    }
}

/** The ride's arrival alarm. Kept in shared preferences so a push or a reboot can move it while the app isn't running. */
data class ArrivalAlarmState(
    val rideId: String,
    /** Identifies the alarm the rider set; pushes carry it. A new lead time or new stops get a new id. */
    val alarmId: String,
    val stopText: String,
    /** One alarm for each stop the rider gets off: a transfer, the destination, or both */
    val stops: List<ArrivalAlarmStop>,
) {
    fun toJson(): String = JSONObject()
        .put("rideId", rideId)
        .put("alarmId", alarmId)
        .put("stopText", stopText)
        .put("stops", JSONArray(stops.map { it.toJson() }))
        .toString()

    companion object {
        fun fromJson(json: String): ArrivalAlarmState? = try {
            val obj = JSONObject(json)
            val stops = obj.getJSONArray("stops")
            ArrivalAlarmState(
                rideId = obj.getString("rideId"),
                alarmId = obj.getString("alarmId"),
                stopText = obj.getString("stopText"),
                stops = (0 until stops.length()).map { ArrivalAlarmStop.fromJson(stops.getJSONObject(it)) },
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

    // A restored alarm this late still rings before arrival, since the shortest lead time is 3 minutes.
    private const val RESTORE_GRACE_MS = 2 * 60 * 1000L

    fun canScheduleExactAlarms(context: Context): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager(context).canScheduleExactAlarms()

    // Moves arrive on the native module thread while the alarm fires on the main one, so every
    // read-modify-write of the state goes through this object's lock.

    /** Schedules every stop's alarm, replacing the current alarm. Throws when exact alarms aren't allowed. */
    @Synchronized
    fun schedule(context: Context, state: ArrivalAlarmState): ArrivalAlarmState {
        val current = ArrivalAlarmStore.load(context)
        val scheduled = scheduleStops(context, state, state.stops.map { it.train }.toSet())

        // A stop of the current alarm that the new one doesn't have.
        current?.stops?.filter { stop -> scheduled.stops.none { it.train == stop.train } }?.forEach {
            alarmManager(context).cancel(fireIntent(context, it.train, 0))
        }

        ArrivalAlarmStore.save(context, scheduled)
        return scheduled
    }

    @Synchronized
    fun cancel(context: Context) {
        ArrivalAlarmStore.load(context)?.stops?.forEach {
            alarmManager(context).cancel(fireIntent(context, it.train, 0))
        }
        ArrivalAlarmStore.save(context, null)
        ArrivalAlarmService.stopRinging()
    }

    /** Moves the stops that didn't ring yet to the dates a push asked for (by train, in ms). Returns false when it couldn't. */
    @Synchronized
    fun move(context: Context, rideId: String, alarmId: String, fireDates: Map<Int, Long>): Boolean {
        val state = ArrivalAlarmStore.load(context)
        // The rider turned the alarm off or changed it, so the push is stale.
        if (state == null || state.rideId != rideId || !state.alarmId.equals(alarmId, ignoreCase = true)) return true
        // A stop that already rang stays put, since moving it would ring it again.
        val pending = state.stops.filter { it.isScheduled }.map { it.train }.toSet()
        if (pending.isEmpty()) return true

        val moved = state.copy(
            stops = state.stops.map { stop ->
                val fireDate = fireDates[stop.train]
                if (stop.train in pending && fireDate != null) stop.copy(fireDate = fireDate) else stop
            },
        )

        return try {
            ArrivalAlarmStore.save(context, scheduleStops(context, moved, pending))
            true
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't move the arrival alarm", e)
            false
        }
    }

    /**
     * The stored alarm, or null when there's none. Revoking the exact alarm permission cancels the
     * pending alarms without telling the app, so an alarm that can no longer ring is dropped here.
     */
    @Synchronized
    fun current(context: Context): ArrivalAlarmState? {
        val state = ArrivalAlarmStore.load(context) ?: return null
        if (state.stops.any { it.isScheduled } && !canScheduleExactAlarms(context)) {
            ArrivalAlarmStore.save(context, null)
            return null
        }
        return state
    }

    /**
     * Called when a stop's alarm goes off. Returns the stop to ring, or null when it was cancelled or moved in the
     * meantime: a broadcast already on its way when the alarm moved carries the old date.
     */
    @Synchronized
    fun markRang(context: Context, train: Int, fireDate: Long): ArrivalAlarmStop? {
        val state = ArrivalAlarmStore.load(context) ?: return null
        val stop = state.stops.find { it.train == train } ?: return null
        if (!stop.isScheduled || stop.fireDate != fireDate) return null

        val rang = stop.copy(isScheduled = false)
        ArrivalAlarmStore.save(context, state.copy(stops = state.stops.map { if (it.train == train) rang else it }))
        return rang
    }

    /** Alarms don't survive a reboot, and are dropped when the exact alarm permission is revoked. */
    @Synchronized
    fun restore(context: Context) {
        val state = ArrivalAlarmStore.load(context) ?: return

        // The phone was off when it should have rung; ringing now would be too late to help.
        val missed = System.currentTimeMillis() - RESTORE_GRACE_MS
        val current = state.copy(
            stops = state.stops.map { if (it.isScheduled && it.fireDate < missed) it.copy(isScheduled = false) else it },
        )
        val pending = current.stops.filter { it.isScheduled }.map { it.train }.toSet()

        // A date that just passed (an app update or a reboot around the fire time) rings right away.
        try {
            ArrivalAlarmStore.save(context, scheduleStops(context, current, pending))
        } catch (e: Exception) {
            Log.w(TAG, "Couldn't restore the arrival alarm", e)
            ArrivalAlarmStore.save(context, current)
        }
    }

    /** Sets the alarms of the stops in `trains`, replacing their current ones. Throws when exact alarms aren't allowed. */
    private fun scheduleStops(context: Context, state: ArrivalAlarmState, trains: Set<Int>): ArrivalAlarmState {
        if (trains.isNotEmpty() && !canScheduleExactAlarms(context)) throw SecurityException("Exact alarms aren't allowed")

        val now = System.currentTimeMillis()
        return state.copy(
            stops = state.stops.map { stop ->
                if (stop.train !in trains) return@map stop

                val scheduled = stop.copy(fireDate = maxOf(stop.fireDate, now + MIN_DELAY_MS), isScheduled = true)
                // setAlarmClock: exact even in Doze, shows the alarm icon in the status bar, and lets the
                // receiver start the ringing service from the background.
                val info = AlarmManager.AlarmClockInfo(scheduled.fireDate, openAppIntent(context))
                alarmManager(context).setAlarmClock(info, fireIntent(context, stop.train, scheduled.fireDate))
                scheduled
            },
        )
    }

    private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // One identity for each stop's train, so a new schedule replaces the last. The extras tell a stale delivery apart.
    private fun fireIntent(context: Context, train: Int, fireDate: Long): PendingIntent = PendingIntent.getBroadcast(
        context,
        train,
        Intent(context, ArrivalAlarmReceiver::class.java)
            .setAction(ArrivalAlarmReceiver.ACTION_FIRE)
            .putExtra(ArrivalAlarmReceiver.EXTRA_TRAIN, train)
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
