package com.betterrail.liveride

import android.app.Notification
import android.os.Build
import android.text.SpannableStringBuilder

/** A fragment of the title or body to color, e.g. a significant delay */
data class TextHighlight(val text: String, val style: Int)

/**
 * Notification colors. Android 17+ (API 37) also gets the system semantic styles
 * ([Notification.SEMANTIC_STYLE_*]), which adapt to the theme; older versions use the explicit colors.
 */
object SemanticColorCompat {
    const val BRAND_COLOR = 0xFF0C83FF.toInt()
    const val COLOR_DELAY_RED = 0xFFFF3B30.toInt()
    // Matches the iOS Live Activity's exchange color
    const val COLOR_TRANSFER = 0xFFFF9500.toInt()

    const val SEMANTIC_STYLE_DANGER = Notification.SEMANTIC_STYLE_DANGER

    /** Applies a semantic style to a ProgressStyle.Segment on Android 17+. */
    fun applySemanticStyle(segment: Notification.ProgressStyle.Segment, style: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.CINNAMON_BUN) {
            segment.setSemanticStyle(style)
        }
    }

    /** Colors each highlighted fragment found in the text on Android 17+; the rest keeps the default color. */
    fun highlight(text: String, highlights: List<TextHighlight>): CharSequence {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.CINNAMON_BUN || highlights.isEmpty()) return text
        val spannable = SpannableStringBuilder(text)
        for (highlight in highlights) {
            val start = text.indexOf(highlight.text)
            if (highlight.text.isEmpty() || start < 0) continue
            spannable.setSpan(
                Notification.createSemanticStyleAnnotation(highlight.style),
                start,
                start + highlight.text.length,
                0,
            )
        }
        return spannable
    }
}
