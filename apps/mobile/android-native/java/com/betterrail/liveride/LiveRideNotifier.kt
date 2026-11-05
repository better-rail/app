package com.betterrail.liveride

import android.app.AlarmManager
import android.app.LocaleManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.drawable.Icon
import android.os.Build
import android.text.TextUtils
import android.util.Log
import android.view.View
import androidx.core.app.NotificationCompat
import com.betterrail.R
import com.betterrail.alarm.ArrivalAlarmScheduler
import java.util.Locale

data class LiveRideContent(
    val title: String,
    val body: String,
    val currentStop: Int,
    val totalStops: Int,
    val progress: Int? = null,
    val maxProgress: Int? = null,
    /** Progress values where the rider changes trains */
    val transferPoints: List<Int> = emptyList(),
    val shortCriticalText: String? = null,
    val stopActionText: String? = null,
    val alertOnce: Boolean = true,
    val highlights: List<TextHighlight> = emptyList(),
    /** Paints the rest of the track red, and the marker */
    val delayed: Boolean = false,
    /** "dot", "transfer", or "platform" (with the platform number as [trackerLabel]) */
    val tracker: String = "dot",
    val trackerLabel: String? = null,
)

object LiveRideNotifier {
    private const val TAG = "LiveRideNotifier"
    const val CHANNEL_ID = "better-rail-live-v2"
    private const val NOTIFICATION_ID = 42001
    private const val ARRIVED_TIMEOUT_MS = 3 * 60 * 1000L
    private const val SEGMENT_RESOLUTION = 100
    private const val PLATFORM_ICON_PX = 96
    @Volatile
    private var channelCreated = false

    fun showProgress(context: Context, content: LiveRideContent, staleUntil: Long? = null) {
        ensureChannel(context)
        val remainingMs = staleUntil?.let { (it - System.currentTimeMillis()).coerceAtLeast(0L) }
        val notification = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.BAKLAVA) {
            runCatching { buildLiveUpdate(context, content, remainingMs) }
                .onFailure { Log.e(TAG, "Live update build failed, using compat progress", it) }
                .getOrNull()
        } else {
            null
        } ?: buildCompatProgress(context, content, remainingMs)

        notificationManager(context).notify(NOTIFICATION_ID, notification)
    }

    fun showArrived(context: Context, title: String, body: String) {
        cancelStale(context)
        ensureChannel(context)
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(SemanticColorCompat.BRAND_COLOR)
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
        notificationManager(context).cancel(NOTIFICATION_ID)
    }

    fun isShowing(context: Context): Boolean =
        notificationManager(context).activeNotifications.any { it.id == NOTIFICATION_ID }

    fun ensureChannel(context: Context) {
        if (channelCreated) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = notificationManager(context)
            val existing = nm.getNotificationChannel(CHANNEL_ID)
            if (existing == null) {
                runCatching { nm.deleteNotificationChannel("better-rail-live") }
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
        channelCreated = true
    }

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

    fun postAlert(context: Context, tag: String, channelId: String, title: String, body: String, timeoutMs: Long) {
        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(SemanticColorCompat.BRAND_COLOR)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setTimeoutAfter(timeoutMs)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))
            .build()
        notificationManager(context).notify(tag, 0, notification)
    }

    private fun buildLiveUpdate(context: Context, content: LiveRideContent, timeoutMs: Long? = null): Notification {
        val numSegments = content.totalStops.coerceAtLeast(1)
        val max = (content.maxProgress ?: (numSegments * SEGMENT_RESOLUTION)).coerceAtLeast(numSegments)
        val currentProgress = content.progress ?: (content.currentStop * SEGMENT_RESOLUTION)
        val clampedProgress = currentProgress.coerceIn(0, max)
        val currentLeg = (clampedProgress.toLong() * numSegments / max).toInt().coerceAtMost(numSegments - 1)

        // One segment per leg, so the gaps between them mark the stations. Progress styling fades what's ahead.
        val style = Notification.ProgressStyle()
            .setStyledByProgress(true)
            .setProgress(clampedProgress)
            .setProgressTrackerIcon(trackerIcon(context, content))
            .setProgressEndIcon(Icon.createWithResource(context, R.drawable.progress_end_icon))

        for (leg in 0 until numSegments) {
            val start = (max.toLong() * leg / numSegments).toInt()
            val end = (max.toLong() * (leg + 1) / numSegments).toInt()
            when {
                !content.delayed || leg < currentLeg -> style.addProgressSegment(trackSegment(end - start, delayed = false))
                // Split the leg the train is on, so only the track ahead of it turns red
                leg == currentLeg && clampedProgress > start -> {
                    style.addProgressSegment(trackSegment(clampedProgress - start, delayed = false))
                    if (end > clampedProgress) style.addProgressSegment(trackSegment(end - clampedProgress, delayed = true))
                }
                else -> style.addProgressSegment(trackSegment(end - start, delayed = true))
            }
        }

        for (position in content.transferPoints) {
            if (position in 1 until max) {
                style.addProgressPoint(Notification.ProgressStyle.Point(position).setColor(SemanticColorCompat.COLOR_TRANSFER))
            }
        }

        val titleText = SemanticColorCompat.highlight(content.title, content.highlights)
        val bodyText = SemanticColorCompat.highlight(content.body, content.highlights)

        val builder = Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(SemanticColorCompat.BRAND_COLOR)
            .setCategory(Notification.CATEGORY_PROGRESS)
            .setContentTitle(titleText)
            .setContentText(bodyText)
            .setStyle(style)
            .setOngoing(true)
            .setOnlyAlertOnce(content.alertOnce)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(ArrivalAlarmScheduler.openAppIntent(context))

        if (Build.VERSION.SDK_INT_FULL >= Build.VERSION_CODES_FULL.BAKLAVA_1) {
            builder.setRequestPromotedOngoing(true)
        } else {
            builder.extras.putBoolean(Notification.EXTRA_REQUEST_PROMOTED_ONGOING, true)
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

        return builder.build()
    }

    private fun trackerIcon(context: Context, content: LiveRideContent): Icon {
        val label = content.trackerLabel?.takeIf { it.isNotBlank() }
        return when {
            content.tracker == "transfer" -> Icon.createWithResource(context, R.drawable.progress_tracker_transfer)
            content.tracker == "platform" && label != null -> Icon.createWithBitmap(
                platformBitmap(
                    label,
                    if (content.delayed) SemanticColorCompat.COLOR_DELAY_RED else SemanticColorCompat.BRAND_COLOR,
                    mirrored = isSystemRtl(context),
                ),
            )
            content.delayed -> Icon.createWithResource(context, R.drawable.progress_tracker_dot_delayed)
            else -> Icon.createWithResource(context, R.drawable.progress_tracker_dot)
        }
    }

    /** The progress bar runs in the system's direction, not the app's language */
    private fun isSystemRtl(context: Context): Boolean {
        val locale = context.getSystemService(LocaleManager::class.java)?.systemLocales?.get(0) ?: Locale.getDefault()
        return TextUtils.getLayoutDirectionFromLocale(locale) == View.LAYOUT_DIRECTION_RTL
    }

    /** The platform number on a colored disc, drawn at runtime since it changes per ride */
    private fun platformBitmap(platform: String, color: Int, mirrored: Boolean): Bitmap {
        val size = PLATFORM_ICON_PX
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color }
        canvas.drawCircle(size / 2f, size / 2f, size / 2f, paint)
        // In RTL the progress bar flips its tracker icon, so pre-flip the number to have it read the right way
        if (mirrored) canvas.scale(-1f, 1f, size / 2f, size / 2f)
        paint.apply {
            this.color = 0xFFFFFFFF.toInt()
            textSize = size * if (platform.length > 1) 0.52f else 0.62f
            typeface = Typeface.DEFAULT_BOLD
            textAlign = Paint.Align.CENTER
        }
        canvas.drawText(platform, size / 2f, size / 2f - (paint.descent() + paint.ascent()) / 2, paint)
        return bitmap
    }

    private fun trackSegment(length: Int, delayed: Boolean) = Notification.ProgressStyle.Segment(length).apply {
        setColor(if (delayed) SemanticColorCompat.COLOR_DELAY_RED else SemanticColorCompat.BRAND_COLOR)
        if (delayed) SemanticColorCompat.applySemanticStyle(this, SemanticColorCompat.SEMANTIC_STYLE_DANGER)
    }

    private fun buildCompatProgress(context: Context, content: LiveRideContent, timeoutMs: Long? = null): Notification {
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(SemanticColorCompat.BRAND_COLOR)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setContentTitle(content.title)
            .setContentText(content.body)
            .setOngoing(true)
            .setOnlyAlertOnce(content.alertOnce)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setShowWhen(false)
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
