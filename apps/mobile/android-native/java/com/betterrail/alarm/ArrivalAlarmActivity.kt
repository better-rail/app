package com.betterrail.alarm

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.format.DateFormat
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.res.ResourcesCompat
import com.betterrail.R
import java.util.Date

/**
 * The full-screen alarm, shown over the lock screen while the alarm rings. Native rather than
 * React Native, so it appears right away even when the app wasn't running.
 */
class ArrivalAlarmActivity : Activity() {
    private val finishWhenStopped: () -> Unit = { runOnUiThread { finish() } }
    private val handler = Handler(Looper.getMainLooper())
    private var clock: TextView? = null
    private val tick = object : Runnable {
        override fun run() {
            clock?.text = DateFormat.getTimeFormat(this@ArrivalAlarmActivity).format(Date())
            handler.postDelayed(this, 1_000)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showOverLockScreen()

        // A late tap on the notification, after the alarm stopped.
        val state = ArrivalAlarmStore.load(this)
        if (!ArrivalAlarmService.isRinging || state == null) {
            finish()
            return
        }

        ArrivalAlarmService.stopListeners.add(finishWhenStopped)
        setContentView(buildContent(state))
    }

    override fun onResume() {
        super.onResume()
        if (!ArrivalAlarmService.isRinging) finish()
        handler.post(tick)
    }

    override fun onPause() {
        handler.removeCallbacks(tick)
        super.onPause()
    }

    override fun onDestroy() {
        ArrivalAlarmService.stopListeners.remove(finishWhenStopped)
        super.onDestroy()
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.statusBarColor = BACKGROUND_TOP
        window.navigationBarColor = BACKGROUND_BOTTOM
    }

    private fun buildContent(state: ArrivalAlarmState): LinearLayout {
        val heebo = try {
            ResourcesCompat.getFont(this, R.font.heebo)
        } catch (e: Exception) {
            null
        } ?: Typeface.DEFAULT

        val icon = ImageView(this).apply {
            setImageResource(R.drawable.arrival_alarm_icon)
            setColorFilter(ICON)
            layoutParams = LinearLayout.LayoutParams(dp(72), dp(72)).apply { bottomMargin = dp(24) }
        }

        val time = TextView(this).apply {
            text = DateFormat.getTimeFormat(this@ArrivalAlarmActivity).format(Date())
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 72f)
            typeface = Typeface.create(heebo, Typeface.NORMAL)
            gravity = Gravity.CENTER
        }
        clock = time

        val title = TextView(this).apply {
            text = state.title
            setTextColor(Color.WHITE)
            alpha = 0.85f
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 24f)
            typeface = Typeface.create(heebo, Typeface.BOLD)
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply { topMargin = dp(8) }
        }

        val stop = Button(this).apply {
            text = state.stopText
            isAllCaps = false
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            typeface = Typeface.create(heebo, Typeface.BOLD)
            stateListAnimator = null
            background = GradientDrawable().apply {
                setColor(BUTTON)
                cornerRadius = dp(40).toFloat()
            }
            layoutParams = LinearLayout.LayoutParams(MATCH_PARENT, dp(80)).apply { topMargin = dp(96) }
            setOnClickListener {
                ArrivalAlarmService.stopRinging()
                finish()
            }
        }

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            background = GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, intArrayOf(BACKGROUND_TOP, BACKGROUND_BOTTOM))
            setPadding(dp(32), dp(32), dp(32), dp(32))
            addView(icon)
            addView(time)
            addView(title)
            addView(stop)
        }
    }

    private fun dp(value: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    companion object {
        // The app's blues: primary for the button, its lighter tint for the icon, on a deep navy.
        private const val BUTTON = 0xFF0C83FF.toInt()
        private const val ICON = 0xFF47A0FF.toInt()
        private const val BACKGROUND_TOP = 0xFF0D2550.toInt()
        private const val BACKGROUND_BOTTOM = 0xFF061233.toInt()
    }
}
