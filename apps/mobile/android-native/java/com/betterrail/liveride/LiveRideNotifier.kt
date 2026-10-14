package com.betterrail.liveride

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import androidx.core.app.NotificationCompat
import com.betterrail.R
import com.betterrail.alarm.ArrivalAlarmScheduler

data class LiveRideContent(
    val title: String,
    val body: String,
    val currentStop: Int,
    val totalStops: Int,
    val progress: Int? = null,
    val maxProgress: Int? = null,
    val shortCriticalText: String? = null,
    val countdownTargetMs: Long? = null,
    val stopActionText: String? = null,
    val alertOnce: Boolean = true,
    val titleSemanticStyle: Int? = null,
    val bodySemanticStyle: Int? = null,
)

/** Manages display and scheduling of live ride notifications. */
object LiveRideNotifier {
    const val CHANNEL_ID = "better-rail-live-v2"
    private const val NOTIFICATION_ID = 42001
    private const val ARRIVED_TIMEOUT_MS = 3 * 60 * 1000L
    private const val SEGMENT_RESOLUTION = 100

    private const val COLOR_TRACK_SEGMENT = 0xFF007AFF.toInt()
    private const val COLOR_DELAY_RED = 0xFFFF3B30.toInt()
    private const val COLOR_EXCHANGE_ORANGE = 0xFFFF9500.toInt()
    private const val COLOR_ON_TIME_GREEN = 0xFF34C759.toInt()
    private const val COLOR_STATION_POINT = 0xFFC8E1FF.toInt()

    fun showProgress(context: Context, content: LiveRideContent, staleUntil: Long? = null) {
        ensureChannel(context)
        dismissAlerts(context)
        val remainingMs = staleUntil?.let { (it - System.currentTimeMillis()).coerceAtLeast(0L) }
        val notification = if (Build.VERSION.SDK_INT >= 36) {
            runCatching { buildLiveUpdate(context, content, remainingMs) }.getOrNull()
        } else {
            null
        } ?: buildCompatProgress(context, content, remainingMs)

        notificationManager(context).notify(NOTIFICATION_ID, notification)
    }

    /** Posts the arrival notification and cancels ongoing live state. */
    fun showArrived(context: Context, title: String, body: String) {
        cancelStale(context)
        ensureChannel(context)
        dismissAlerts(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(title)
            .setContentText(body)
            .setOngoing(false)
            .setAutoCancel(true)
            .setTimeoutAfter(ARRIVED_TIMEOUT_MS)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))
            .build()
        notificationManager(context).notify(NOTIFICATION_ID, notification)
    }

    fun cancel(context: Context) {
        cancelStale(context)
        dismissAlerts(context)
        notificationManager(context).cancel(NOTIFICATION_ID)
    }

    fun dismissAlerts(context: Context) {
        runCatching {
            notificationManager(context).activeNotifications.forEach { sbn ->
                if (sbn.tag?.startsWith("live-ride-alert") == true) {
                    notificationManager(context).cancel(sbn.tag, sbn.id)
                }
            }
        }
    }

    fun isShowing(context: Context): Boolean =
        notificationManager(context).activeNotifications.any { it.id == NOTIFICATION_ID }

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = notificationManager(context)
            nm.deleteNotificationChannel("better-rail-live")
            val existing = nm.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Better Rail Live",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Live ride progress and milestone updates"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 250, 200, 250)
                    setSound(null, null)
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    /** Schedules fallback notification triggered when updates lapse. */
    fun scheduleStale(context: Context, stale: LiveRideContent, delayMs: Long, staleUntil: Long) {
        val triggerAt = System.currentTimeMillis() + delayMs
        val intent = staleIntent(context, LiveRideStaleReceiver.toIntent(context, stale, staleUntil))
        val alarms = alarmManager(context)
        if (ArrivalAlarmScheduler.canScheduleExactAlarms(context)) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, intent)
        }
    }

    fun cancelStale(context: Context) {
        alarmManager(context).cancel(staleIntent(context, Intent(context, LiveRideStaleReceiver::class.java)))
    }

    /** Posts an alert notification. */
    fun postAlert(context: Context, tag: String, channelId: String, title: String, body: String, timeoutMs: Long) {
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.notification_icon)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setTimeoutAfter(timeoutMs)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))
            .build()
        notificationManager(context).notify(tag, 0, notification)
    }

    private data class ProgressBounds(val numSegments: Int, val max: Int, val progress: Int)

    private fun computeProgressBounds(content: LiveRideContent): ProgressBounds {
        val numSegments = content.totalStops.coerceAtLeast(1)
        val max = (content.maxProgress ?: (numSegments * SEGMENT_RESOLUTION)).coerceAtLeast(1)
        val currentProgress = content.progress ?: (content.currentStop * SEGMENT_RESOLUTION)
        return ProgressBounds(numSegments, max, currentProgress.coerceIn(0, max))
    }

    private data class SemanticPresentation(val color: Int, val style: Int)

    private fun resolveSemanticPresentation(semanticStyle: Int?): SemanticPresentation = when (semanticStyle) {
        SemanticColorCompat.SEMANTIC_STYLE_DANGER -> SemanticPresentation(COLOR_DELAY_RED, SemanticColorCompat.SEMANTIC_STYLE_DANGER)
        SemanticColorCompat.SEMANTIC_STYLE_CAUTION -> SemanticPresentation(COLOR_EXCHANGE_ORANGE, SemanticColorCompat.SEMANTIC_STYLE_CAUTION)
        SemanticColorCompat.SEMANTIC_STYLE_SAFE -> SemanticPresentation(COLOR_ON_TIME_GREEN, SemanticColorCompat.SEMANTIC_STYLE_SAFE)
        else -> SemanticPresentation(COLOR_TRACK_SEGMENT, SemanticColorCompat.SEMANTIC_STYLE_INFO)
    }

    private fun buildLiveUpdate(context: Context, content: LiveRideContent, timeoutMs: Long? = null): Notification {
        val (numSegments, max, clampedProgress) = computeProgressBounds(content)

        val style = Notification.ProgressStyle()
            .setStyledByProgress(true)
            .setProgress(clampedProgress)

        val presentation = resolveSemanticPresentation(content.titleSemanticStyle)

        val trackSegment = Notification.ProgressStyle.Segment(max)
        trackSegment.setColor(presentation.color)
        trackSegment.setId(0)
        SemanticColorCompat.applySemanticStyle(trackSegment, presentation.style)
        style.addProgressSegment(trackSegment)

        val intermediateStops = numSegments - 1
        val pointsToPlace = intermediateStops.coerceIn(0, 4)
        for (step in 1..pointsToPlace) {
            val stopIndex = if (intermediateStops <= 4) step else (step.toLong() * numSegments / (pointsToPlace + 1)).toInt().coerceIn(1, intermediateStops)
            val position = (max.toLong() * stopIndex / numSegments).toInt()
            val point = Notification.ProgressStyle.Point(position)
            point.setColor(COLOR_STATION_POINT)
            point.setId(step)
            val pointSemanticStyle = if (step == pointsToPlace) {
                presentation.style
            } else {
                SemanticColorCompat.SEMANTIC_STYLE_INFO
            }
            SemanticColorCompat.applySemanticStyle(point, pointSemanticStyle)
            style.addProgressPoint(point)
        }

        style.setProgressTrackerIcon(Icon.createWithResource(context, R.drawable.progress_tracker_icon))

        val builder = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(presentation.color)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setContentTitle(SemanticColorCompat.formatTitle(content.title, content.titleSemanticStyle))
            .setContentText(SemanticColorCompat.formatBody(content.body, content.bodySemanticStyle))
            .setStyle(style)
            .setOngoing(true)
            .setOnlyAlertOnce(content.alertOnce)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))

        builder.extras.putBoolean("android.requestPromotedOngoing", true)
        runCatching {
            Notification.Builder::class.java
                .getMethod("setRequestPromotedOngoing", Boolean::class.javaPrimitiveType)
                .invoke(builder, true)
        }

        content.shortCriticalText?.takeIf { it.isNotBlank() }?.let { chipText ->
            builder.setShortCriticalText(chipText)
        }

        content.stopActionText?.takeIf { it.isNotBlank() }?.let { actionTitle ->
            val stopAction = Notification.Action.Builder(
                null,
                actionTitle,
                stopIntent(context)
            ).build()
            builder.addAction(stopAction)
        }

        builder.setShowWhen(false)
        if (timeoutMs != null && timeoutMs > 0) {
            builder.setTimeoutAfter(timeoutMs)
        }

        val notification = builder.build()
        notification.flags = notification.flags or Notification.FLAG_PROMOTED_ONGOING
        return notification
    }

    private fun buildCompatProgress(context: Context, content: LiveRideContent, timeoutMs: Long? = null): Notification {
        val (_, max, clampedProgress) = computeProgressBounds(content)
        val compatColor = resolveSemanticPresentation(content.titleSemanticStyle).color

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(compatColor)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentTitle(content.title)
            .setContentText(content.body)
            .setOngoing(true)
            .setOnlyAlertOnce(content.alertOnce)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)
            .setProgress(max, clampedProgress, false)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))

        if (timeoutMs != null && timeoutMs > 0) {
            builder.setTimeoutAfter(timeoutMs)
        }

        content.stopActionText?.takeIf { it.isNotBlank() }?.let { actionTitle ->
            builder.addAction(0, actionTitle, stopIntent(context))
        }

        return builder.build()
    }

    private fun stopIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
        context,
        1,
        Intent(context, LiveRideActionReceiver::class.java).setAction(LiveRideActionReceiver.ACTION_STOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun staleIntent(context: Context, intent: Intent): PendingIntent = PendingIntent.getBroadcast(
        context,
        0,
        intent.setAction(LiveRideStaleReceiver.ACTION_STALE),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun notificationManager(context: Context) =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    private fun alarmManager(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
}
