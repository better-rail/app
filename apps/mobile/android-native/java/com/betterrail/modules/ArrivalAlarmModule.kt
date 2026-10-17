package com.betterrail.modules

import android.app.NotificationManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.betterrail.alarm.ArrivalAlarmScheduler
import com.betterrail.alarm.ArrivalAlarmService
import com.betterrail.alarm.ArrivalAlarmState
import com.betterrail.alarm.ArrivalAlarmStop
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableArray
import com.facebook.react.module.annotations.ReactModule

/** The Android side of the arrival alarm. Mirrors the alarm methods of the iOS RNBetterRail module. */
@ReactModule(name = ArrivalAlarmModule.NAME)
class ArrivalAlarmModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    /** "authorized", or "denied" when exact alarms or notifications (which carry the Stop button) are off */
    @ReactMethod
    fun arrivalAlarmAuthorization(promise: Promise) {
        promise.resolve(authorization())
    }

    /** Android has no prompt for either; the app sends the rider to Settings instead. */
    @ReactMethod
    fun requestArrivalAlarmAuthorization(promise: Promise) {
        promise.resolve(authorization())
    }

    /** alarm - { rideId, alarmId, stopText, stops: [{ train, title, fireDate (ms) }] }. Resolves with [{ train, fireDate (ms) }], when each will ring. */
    @ReactMethod
    fun scheduleArrivalAlarm(alarm: ReadableMap, promise: Promise) {
        try {
            val stops = maps(alarm.getArray("stops")).map {
                ArrivalAlarmStop(
                    train = it.getInt("train"),
                    title = it.getString("title") ?: throw IllegalArgumentException("title"),
                    fireDate = it.getDouble("fireDate").toLong(),
                    isScheduled = true,
                )
            }
            if (stops.isEmpty()) throw IllegalArgumentException("stops")

            val state = ArrivalAlarmState(
                rideId = alarm.getString("rideId") ?: throw IllegalArgumentException("rideId"),
                alarmId = alarm.getString("alarmId") ?: throw IllegalArgumentException("alarmId"),
                stopText = alarm.getString("stopText") ?: throw IllegalArgumentException("stopText"),
                stops = stops,
            )
            // A new alarm replaces one that's ringing, like the dev test alarm.
            ArrivalAlarmService.stopRinging()
            val scheduled = ArrivalAlarmScheduler.schedule(reactApplicationContext, state)
            promise.resolve(stopsArray(scheduled.stops, withState = false))
        } catch (e: Exception) {
            promise.reject("error", "Couldn't schedule the arrival alarm", e)
        }
    }

    /** Applies an arrival-alarm push (fire dates in seconds, as the server sends them). False when it couldn't move the alarm. */
    @ReactMethod
    fun moveArrivalAlarm(push: ReadableMap, promise: Promise) {
        val rideId = push.getString("rideId")
        val alarmId = push.getString("alarmId")
        val fireDates = maps(if (push.hasKey("stops")) push.getArray("stops") else null)
            .filter { it.hasKey("train") && it.hasKey("fireDate") }
            .associate { it.getInt("train") to (it.getDouble("fireDate") * 1000).toLong() }
        if (rideId == null || alarmId == null || fireDates.isEmpty()) {
            promise.resolve(false)
            return
        }

        promise.resolve(ArrivalAlarmScheduler.move(reactApplicationContext, rideId, alarmId, fireDates))
    }

    @ReactMethod
    fun cancelArrivalAlarm() {
        ArrivalAlarmScheduler.cancel(reactApplicationContext)
    }

    /** Resolves with { rideId, alarmId, stops: [{ train, fireDate (ms), isScheduled }] }, or null when there's no alarm. */
    @ReactMethod
    fun getArrivalAlarm(promise: Promise) {
        val state = ArrivalAlarmScheduler.current(reactApplicationContext)
        if (state == null) {
            promise.resolve(null)
            return
        }

        promise.resolve(
            Arguments.createMap().apply {
                putString("rideId", state.rideId)
                putString("alarmId", state.alarmId)
                putArray("stops", stopsArray(state.stops, withState = true))
            },
        )
    }

    /** Whether the alarm can take over the lock screen. Without it, it rings as a heads-up notification. */
    @ReactMethod
    fun canUseFullScreenIntent(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            promise.resolve(true)
            return
        }

        val manager = reactApplicationContext.getSystemService(NotificationManager::class.java)
        promise.resolve(manager.canUseFullScreenIntent())
    }

    /** kind - "fullScreen" for the full-screen alarm setting, otherwise whichever of exact alarms or notifications is off */
    @ReactMethod
    fun openArrivalAlarmSettings(kind: String) {
        val context = reactApplicationContext
        val packageUri = Uri.parse("package:${context.packageName}")
        val intent = when {
            kind == "fullScreen" && Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ->
                Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, packageUri)
            !ArrivalAlarmScheduler.canScheduleExactAlarms(context) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ->
                Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, packageUri)
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
                Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
            else -> Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri)
        }

        try {
            context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: Exception) {
            context.startActivity(
                Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, packageUri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }

    private fun maps(array: ReadableArray?): List<ReadableMap> =
        (0 until (array?.size() ?: 0)).mapNotNull { array?.getMap(it) }

    private fun stopsArray(stops: List<ArrivalAlarmStop>, withState: Boolean): WritableArray =
        Arguments.createArray().apply {
            stops.forEach { stop ->
                pushMap(
                    Arguments.createMap().apply {
                        putInt("train", stop.train)
                        putDouble("fireDate", stop.fireDate.toDouble())
                        if (withState) putBoolean("isScheduled", stop.isScheduled)
                    },
                )
            }
        }

    private fun authorization(): String {
        val context = reactApplicationContext
        val notifications = NotificationManagerCompat.from(context)
        // The alarm's own channel can be turned off on its own, which hides the Stop button.
        val channelBlocked = notifications.getNotificationChannelCompat(ArrivalAlarmService.CHANNEL_ID)
            ?.let { it.importance == NotificationManagerCompat.IMPORTANCE_NONE } ?: false
        val notificationsEnabled = notifications.areNotificationsEnabled() && !channelBlocked
        return if (ArrivalAlarmScheduler.canScheduleExactAlarms(context) && notificationsEnabled) "authorized" else "denied"
    }

    companion object {
        const val NAME = "ArrivalAlarm"
    }
}
