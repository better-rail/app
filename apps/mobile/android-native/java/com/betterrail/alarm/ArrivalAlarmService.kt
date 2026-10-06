package com.betterrail.alarm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import com.betterrail.R
import java.util.concurrent.CopyOnWriteArraySet

/**
 * Rings the arrival alarm: loops the alarm sound on the alarm stream (so it's heard on silent),
 * vibrates, and shows a full-screen alarm, until the rider stops it or it times out.
 *
 * A `systemExempted` foreground service, which Android allows for apps holding the exact alarm
 * permission. Android 17 only lets background audio play from a foreground service, and exempts
 * `USAGE_ALARM` audio from its other requirements when the app holds that permission.
 */
class ArrivalAlarmService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private val stopRunnable = Runnable { stop() }
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var focusRequest: AudioFocusRequest? = null
    private var isStopped = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stop()
            return START_NOT_STICKY
        }

        val state = ArrivalAlarmStore.load(this)
        if (state == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        // Within 5 seconds of the start, and before anything that could be slow.
        if (!startInForeground(state)) {
            stopSelf()
            return START_NOT_STICKY
        }

        instance = this
        isStopped = false
        handler.removeCallbacks(stopRunnable)
        handler.postDelayed(stopRunnable, RING_DURATION_MS)

        acquireWakeLock()
        playSound()
        vibrate()
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stop()
        super.onDestroy()
    }

    private fun startInForeground(state: ArrivalAlarmState): Boolean {
        createChannel(this)
        return try {
            val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED
            } else {
                0
            }
            ServiceCompat.startForeground(this, NOTIFICATION_ID, buildNotification(state), type)
            true
        } catch (e: Exception) {
            // The exact alarm permission was revoked, or the system refused the start: show the alarm
            // without sound rather than nothing.
            Log.w(TAG, "Couldn't start the alarm in the foreground", e)
            val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
            manager.notify(NOTIFICATION_ID, buildNotification(state))
            false
        }
    }

    private fun buildNotification(state: ArrivalAlarmState): Notification {
        val fullScreen = PendingIntent.getActivity(
            this,
            0,
            Intent(this, ArrivalAlarmActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val stop = PendingIntent.getService(
            this,
            0,
            Intent(this, ArrivalAlarmService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.notification_icon)
            .setColor(BRAND_COLOR)
            .setContentTitle(state.title)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(fullScreen)
            // Without the full-screen intent permission, Android shows this as a heads-up notification instead.
            .setFullScreenIntent(fullScreen, true)
            .addAction(0, state.stopText, stop)
            // Android 14 lets riders swipe away even ongoing notifications.
            .setDeleteIntent(stop)
            .build()
    }

    private fun acquireWakeLock() {
        val power = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BetterRail:ArrivalAlarm").apply {
            acquire(RING_DURATION_MS + 10_000L)
        }
    }

    private fun playSound() {
        player?.release()
        player = null

        val audio = getSystemService(AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(ALARM_AUDIO)
                .build()
                .also(audio::requestAudioFocus)
        } else {
            @Suppress("DEPRECATION")
            audio.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }

        // The rider's alarm sound, falling back to other system sounds when it's unset or unreadable.
        val candidates = listOfNotNull(
            RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        )
        for (uri in candidates) {
            player = tryPlay(uri) ?: continue
            return
        }
        Log.w(TAG, "No playable alarm sound")
    }

    private fun tryPlay(uri: Uri): MediaPlayer? {
        val mediaPlayer = MediaPlayer()
        return try {
            mediaPlayer.setAudioAttributes(ALARM_AUDIO)
            mediaPlayer.setDataSource(this, uri)
            mediaPlayer.isLooping = true
            mediaPlayer.prepare()
            mediaPlayer.start()
            mediaPlayer
        } catch (e: Exception) {
            mediaPlayer.release()
            null
        }
    }

    private fun vibrate() {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(VIBRATOR_SERVICE) as Vibrator
        }
        this.vibrator = vibrator
        if (!vibrator.hasVibrator()) return

        when {
            // Alarm vibrations play even when touch vibrations are off.
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
                vibrator.vibrate(
                    VibrationEffect.createWaveform(VIBRATION_PATTERN, 0),
                    VibrationAttributes.createForUsage(VibrationAttributes.USAGE_ALARM),
                )
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
                @Suppress("DEPRECATION")
                vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, 0), ALARM_AUDIO)
            else ->
                @Suppress("DEPRECATION")
                vibrator.vibrate(VIBRATION_PATTERN, 0, ALARM_AUDIO)
        }
    }

    /** Idempotent: the Stop button, the full-screen alarm, the timeout and a cancelled ride can all call it. */
    private fun stop() {
        if (isStopped) return
        isStopped = true

        handler.removeCallbacks(stopRunnable)
        player?.run {
            try {
                stop()
            } catch (e: IllegalStateException) {
            }
            release()
        }
        player = null
        vibrator?.cancel()

        val audio = getSystemService(AUDIO_SERVICE) as AudioManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            focusRequest?.let(audio::abandonAudioFocusRequest)
        } else {
            @Suppress("DEPRECATION")
            audio.abandonAudioFocus(null)
        }
        focusRequest = null

        wakeLock?.takeIf { it.isHeld }?.release()
        wakeLock = null

        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()

        if (instance === this) instance = null
        stopListeners.forEach { it() }
    }

    companion object {
        private const val TAG = "ArrivalAlarm"
        const val ACTION_STOP = "com.betterrail.alarm.ACTION_STOP"
        const val CHANNEL_ID = "better-rail-arrival-alarm"
        private const val NOTIFICATION_ID = 7301
        private const val RING_DURATION_MS = 2 * 60 * 1000L
        // The app's primary blue, matching the full-screen alarm.
        private const val BRAND_COLOR = 0xFF0C83FF.toInt()
        private val VIBRATION_PATTERN = longArrayOf(0, 800, 600)

        private val ALARM_AUDIO: AudioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()

        @Volatile
        private var instance: ArrivalAlarmService? = null

        /** Called when the alarm stops ringing, so the full-screen alarm closes with it. */
        val stopListeners = CopyOnWriteArraySet<() -> Unit>()

        val isRinging: Boolean get() = instance != null

        fun start(context: Context) {
            ContextCompat.startForegroundService(context, Intent(context, ArrivalAlarmService::class.java))
        }

        fun stopRinging() {
            val service = instance ?: return
            Handler(Looper.getMainLooper()).post { service.stop() }
        }

        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val channel = NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.arrival_alarm_channel_name),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = context.getString(R.string.arrival_alarm_channel_description)
                // The service plays the sound and vibration, which the channel would otherwise duplicate.
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            (context.getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
        }
    }
}
