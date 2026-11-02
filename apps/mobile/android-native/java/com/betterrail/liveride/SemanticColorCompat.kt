package com.betterrail.liveride

import android.app.Notification
import android.os.Build
import android.text.SpannableStringBuilder

/**
 * Compatibility helper for notification semantic coloring.
 * - Android 16+ (API 36): Maps semantic states to explicit ARGB segment colors via [resolveColor].
 * - Android 17+ (API 37): Also applies system semantic styles ([Notification.SEMANTIC_STYLE_*])
 *   to segments, points, and text annotations.
 */
object SemanticColorCompat {
    const val BRAND_COLOR = 0xFF0C83FF.toInt()
    const val COLOR_DELAY_RED = 0xFFFF3B30.toInt()
    const val COLOR_EXCHANGE_ORANGE = 0xFFFF9500.toInt()
    const val COLOR_ON_TIME_GREEN = 0xFF34C759.toInt()
    const val COLOR_STATION_POINT = 0xFFC8E1FF.toInt()

    const val SEMANTIC_STYLE_UNSPECIFIED = Notification.SEMANTIC_STYLE_UNSPECIFIED
    const val SEMANTIC_STYLE_INFO = Notification.SEMANTIC_STYLE_INFO
    const val SEMANTIC_STYLE_SAFE = Notification.SEMANTIC_STYLE_SAFE
    const val SEMANTIC_STYLE_CAUTION = Notification.SEMANTIC_STYLE_CAUTION
    const val SEMANTIC_STYLE_DANGER = Notification.SEMANTIC_STYLE_DANGER

    /** Maps a semantic style to its ARGB color representation. Defaults to BRAND_COLOR. */
    fun resolveColor(semanticStyle: Int?): Int = when (semanticStyle) {
        SEMANTIC_STYLE_DANGER -> COLOR_DELAY_RED
        SEMANTIC_STYLE_CAUTION -> COLOR_EXCHANGE_ORANGE
        SEMANTIC_STYLE_SAFE -> COLOR_ON_TIME_GREEN
        else -> BRAND_COLOR
    }

    /** Applies semantic styling to a ProgressStyle.Segment on Android 17+. */
    fun applySemanticStyle(segment: Notification.ProgressStyle.Segment, style: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.CINNAMON_BUN) {
            segment.setSemanticStyle(style)
        }
    }

    /** Applies semantic styling to a ProgressStyle.Point on Android 17+. */
    fun applySemanticStyle(point: Notification.ProgressStyle.Point, style: Int) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.CINNAMON_BUN) {
            point.setSemanticStyle(style)
        }
    }

    /** Annotates text with the matching semantic style on Android 17+. */
    fun formatText(text: String, semanticStyle: Int?): CharSequence {
        if (
            Build.VERSION.SDK_INT < Build.VERSION_CODES.CINNAMON_BUN ||
            semanticStyle == null ||
            semanticStyle == SEMANTIC_STYLE_UNSPECIFIED ||
            text.isEmpty()
        ) {
            return text
        }
        return SpannableStringBuilder(text).apply {
            setSpan(Notification.createSemanticStyleAnnotation(semanticStyle), 0, text.length, 0)
        }
    }
}
