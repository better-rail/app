package com.betterrail.liveride

import android.app.Notification
import android.os.Build
import android.text.Annotation
import android.text.SpannableStringBuilder

/**
 * Compatibility helper for Android 17 (API 37) notification semantic coloring.
 * Applies semantic styles matching iOS Live Activity states:
 * - SAFE (Green): On-time transit, arrival, disembarking
 * - CAUTION (Orange): Waiting for train, exchange/transfer, connection issues
 * - DANGER (Red): Train delay
 * - INFO (Blue): General informational markers & route track
 */
object SemanticColorCompat {
    const val SEMANTIC_STYLE_UNSPECIFIED = 0
    const val SEMANTIC_STYLE_INFO = 1
    const val SEMANTIC_STYLE_SAFE = 2
    const val SEMANTIC_STYLE_CAUTION = 3
    const val SEMANTIC_STYLE_DANGER = 4

    private const val ANNOTATION_KEY = "android.app.notification.semanticStyle"

    /** Applies semantic styling to Notification, ProgressStyle.Segment, or ProgressStyle.Point via reflection. */
    fun applySemanticStyle(target: Any, style: Int): Boolean {
        if (Build.VERSION.SDK_INT < 37) return false
        return runCatching {
            val method = target.javaClass.getMethod("setSemanticStyle", Int::class.javaPrimitiveType)
            method.invoke(target, style)
            true
        }.getOrDefault(false)
    }

    /** Creates an Annotation for text semantic style. */
    fun createAnnotation(style: Int): Any? {
        if (Build.VERSION.SDK_INT < 37) return null
        val reflected = runCatching {
            Notification::class.java
                .getMethod("createSemanticStyleAnnotation", Int::class.javaPrimitiveType)
                .invoke(null, style)
        }.getOrNull()
        return reflected ?: Annotation(ANNOTATION_KEY, style.toString())
    }

    /** Wraps a text in a semantic style annotation. */
    fun annotate(text: CharSequence, style: Int, start: Int = 0, end: Int = text.length): CharSequence {
        if (Build.VERSION.SDK_INT < 37 || start < 0 || end <= start || end > text.length) return text
        val annotation = createAnnotation(style) ?: return text
        val ssb = if (text is SpannableStringBuilder) text else SpannableStringBuilder(text)
        ssb.setSpan(annotation, start, end, 0)
        return ssb
    }

    /** Annotates text with the matching semantic style. */
    fun formatText(text: String, semanticStyle: Int?): CharSequence {
        if (Build.VERSION.SDK_INT < 37 || semanticStyle == null || semanticStyle == SEMANTIC_STYLE_UNSPECIFIED) {
            return text
        }
        return annotate(text, semanticStyle)
    }
}
