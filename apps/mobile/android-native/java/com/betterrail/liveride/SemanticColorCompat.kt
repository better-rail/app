package com.betterrail.liveride

import android.app.Notification
import android.os.Build
import android.text.Annotation
import android.text.SpannableStringBuilder

/** Compatibility helper for Android 17 (API 37) notification semantic coloring. */
object SemanticColorCompat {
    const val SEMANTIC_STYLE_UNSPECIFIED = 0
    const val SEMANTIC_STYLE_INFO = 1
    const val SEMANTIC_STYLE_SAFE = 2
    const val SEMANTIC_STYLE_CAUTION = 3
    const val SEMANTIC_STYLE_DANGER = 4

    private const val ANNOTATION_KEY = "android.app.notification.semanticStyle"
    private val DELAY_REGEX = Regex("""\(\+?\d+[^)]*\)""")
    private val TIME_REGEX = Regex("""\(\d{1,2}:\d{2}(?:\s*[AaPp][Mm])?\)""")

    fun applySemanticStyle(target: Any, style: Int): Boolean {
        if (Build.VERSION.SDK_INT < 37) return false
        return runCatching {
            val method = target.javaClass.getMethod("setSemanticStyle", Int::class.javaPrimitiveType)
            method.invoke(target, style)
            true
        }.getOrDefault(false)
    }

    fun createAnnotation(style: Int): Any? {
        if (Build.VERSION.SDK_INT < 37) return null
        val reflected = runCatching {
            Notification::class.java
                .getMethod("createSemanticStyleAnnotation", Int::class.javaPrimitiveType)
                .invoke(null, style)
        }.getOrNull()
        return reflected ?: Annotation(ANNOTATION_KEY, style.toString())
    }

    fun annotate(text: CharSequence, style: Int, start: Int = 0, end: Int = text.length): CharSequence {
        if (Build.VERSION.SDK_INT < 37 || start < 0 || end <= start || end > text.length) return text
        val annotation = createAnnotation(style) ?: return text
        val ssb = if (text is SpannableStringBuilder) text else SpannableStringBuilder(text)
        ssb.setSpan(annotation, start, end, 0)
        return ssb
    }

    fun formatTitle(title: String, semanticStyle: Int? = null): CharSequence {
        if (Build.VERSION.SDK_INT < 37) return title

        val delayMatch = DELAY_REGEX.find(title)
        if (delayMatch != null && (semanticStyle == SEMANTIC_STYLE_CAUTION || semanticStyle == SEMANTIC_STYLE_DANGER)) {
            val ssb = SpannableStringBuilder(title)
            val annotation = createAnnotation(semanticStyle) ?: return title
            ssb.setSpan(annotation, delayMatch.range.first, delayMatch.range.last + 1, 0)
            return ssb
        }

        val timeMatch = TIME_REGEX.find(title)
        if (timeMatch != null) {
            val ssb = SpannableStringBuilder(title)
            val targetStyle = semanticStyle ?: SEMANTIC_STYLE_SAFE
            val annotation = createAnnotation(targetStyle) ?: return title
            ssb.setSpan(annotation, timeMatch.range.first, timeMatch.range.last + 1, 0)
            return ssb
        }

        if (semanticStyle != null && semanticStyle != SEMANTIC_STYLE_UNSPECIFIED) {
            return annotate(title, semanticStyle)
        }

        return title
    }

    fun formatBody(body: String, semanticStyle: Int? = null): CharSequence {
        if (Build.VERSION.SDK_INT < 37 || semanticStyle == null || semanticStyle == SEMANTIC_STYLE_UNSPECIFIED) {
            return body
        }
        return annotate(body, semanticStyle)
    }
}
