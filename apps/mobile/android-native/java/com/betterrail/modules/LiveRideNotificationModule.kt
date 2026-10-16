package com.betterrail.modules

import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.betterrail.alarm.ArrivalAlarmScheduler
import com.betterrail.liveride.LiveRideContent
import com.betterrail.liveride.LiveRideNotifier
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = LiveRideNotificationModule.NAME)
class LiveRideNotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun canPostPromoted(promise: Promise) {
        if (Build.VERSION.SDK_INT < 36) {
            promise.resolve(false)
            return
        }
        val manager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        promise.resolve(runCatching { manager.canPostPromotedNotifications() }.getOrDefault(false))
    }

    @ReactMethod
    fun canScheduleExactAlarms(promise: Promise) {
        promise.resolve(ArrivalAlarmScheduler.canScheduleExactAlarms(reactApplicationContext))
    }

    @ReactMethod
    fun updateLiveRide(options: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val progressContent = parseLiveRideContent(options)
            if (options.hasKey("isArrived") && options.getBoolean("isArrived")) {
                LiveRideNotifier.showArrived(context, progressContent.title, progressContent.body)
                promise.resolve(true)
                return
            }

            LiveRideNotifier.showProgress(context, progressContent)

            val stale = if (options.hasKey("stale")) options.getMap("stale") else null
            if (stale != null && options.hasKey("staleAfterMs")) {
                val staleContent = parseLiveRideContent(
                    stale,
                    fallbackTitle = progressContent.title,
                    fallbackBody = progressContent.body,
                    defaultStop = progressContent.currentStop,
                    defaultTotal = progressContent.totalStops,
                )
                LiveRideNotifier.scheduleStale(
                    context,
                    staleContent,
                    delayMs = options.getDouble("staleAfterMs").toLong(),
                    staleUntil = stale.getDouble("untilMs").toLong(),
                )
            } else {
                LiveRideNotifier.cancelStale(context)
            }

            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("NOTIFICATION_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelLiveRide(promise: Promise) {
        try {
            LiveRideNotifier.cancel(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("NOTIFICATION_CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun postAlert(options: ReadableMap, promise: Promise) {
        try {
            LiveRideNotifier.postAlert(
                reactApplicationContext,
                tag = options.getString("tag") ?: "better-rail-alert",
                channelId = options.getString("channelId") ?: "better-rail",
                title = options.getString("title") ?: "",
                body = options.getString("body") ?: "",
                timeoutMs = options.getDouble("timeoutMs").toLong(),
            )
            promise.resolve(true)
        } catch (e: Throwable) {
            promise.reject("NOTIFICATION_ALERT_ERROR", e.message, e)
        }
    }

    override fun initialize() {
        super.initialize()
        instance = this
    }

    override fun invalidate() {
        if (instance == this) {
            instance = null
        }
        super.invalidate()
    }

    fun emitStopRequested() {
        if (reactApplicationContext.hasActiveReactInstance()) {
            reactApplicationContext
                .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("onLiveRideStopRequested", null)
        }
    }

    companion object {
        const val NAME = "LiveRideNotificationModule"
        @Volatile
        private var instance: LiveRideNotificationModule? = null

        fun notifyStopRequested() {
            instance?.emitStopRequested()
        }
    }
}

private fun ReadableMap.optString(key: String): String? = if (hasKey(key)) getString(key) else null
private fun ReadableMap.optInt(key: String, default: Int): Int = if (hasKey(key)) getInt(key) else default
private fun ReadableMap.optIntOrNull(key: String): Int? = if (hasKey(key) && !isNull(key)) getInt(key) else null

private fun parseLiveRideContent(
    map: ReadableMap,
    fallbackTitle: String = "",
    fallbackBody: String = "",
    defaultStop: Int = 0,
    defaultTotal: Int = 1,
): LiveRideContent = LiveRideContent(
    title = map.optString("title") ?: fallbackTitle,
    body = map.optString("body") ?: fallbackBody,
    currentStop = map.optInt("currentStop", defaultStop),
    totalStops = map.optInt("totalStops", defaultTotal),
    progress = if (map.hasKey("progress")) map.getInt("progress") else null,
    maxProgress = if (map.hasKey("maxProgress")) map.getInt("maxProgress") else null,
    shortCriticalText = map.optString("shortCriticalText"),
    stopActionText = map.optString("stopActionText"),
    alertOnce = if (map.hasKey("alertOnce")) map.getBoolean("alertOnce") else true,
    titleSemanticStyle = map.optIntOrNull("titleSemanticStyle"),
)
