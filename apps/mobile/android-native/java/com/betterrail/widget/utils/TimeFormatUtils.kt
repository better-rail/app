package com.betterrail.widget.utils

import android.content.Context
import android.text.format.DateFormat
import java.text.SimpleDateFormat
import java.util.Locale

object TimeFormatUtils {
    /** AM/PM only for an English app on an English device set to a 12-hour clock */
    fun use12HourClock(context: Context): Boolean {
        return LocaleUtils.getAppLanguage(context) == "en" &&
            Locale.getDefault().language == "en" &&
            !DateFormat.is24HourFormat(context)
    }

    /** Converts an internal "HH:mm" string to the display format. Placeholders like "--:--" pass through. */
    fun formatForDisplay(context: Context, time: String): String {
        if (!use12HourClock(context)) return time
        return try {
            val parsed = SimpleDateFormat("HH:mm", Locale.US).parse(time) ?: return time
            SimpleDateFormat("h:mm a", Locale.US).format(parsed)
        } catch (_: Exception) {
            time
        }
    }
}
