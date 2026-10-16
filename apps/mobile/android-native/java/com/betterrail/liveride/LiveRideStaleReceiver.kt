package com.betterrail.liveride

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class LiveRideStaleReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_STALE) return

        val staleUntil = intent.getLongExtra(EXTRA_UNTIL, 0)
        if (System.currentTimeMillis() >= staleUntil || !LiveRideNotifier.isShowing(context)) return

        val content = LiveRideContent(
            title = intent.getStringExtra(EXTRA_TITLE) ?: return,
            body = intent.getStringExtra(EXTRA_BODY) ?: return,
            currentStop = intent.getIntExtra(EXTRA_CURRENT_STOP, 0),
            totalStops = intent.getIntExtra(EXTRA_TOTAL_STOPS, 1),
            progress = if (intent.hasExtra(EXTRA_PROGRESS)) intent.getIntExtra(EXTRA_PROGRESS, 0) else null,
            maxProgress = if (intent.hasExtra(EXTRA_MAX_PROGRESS)) intent.getIntExtra(EXTRA_MAX_PROGRESS, 1) else null,
            shortCriticalText = intent.getStringExtra(EXTRA_SHORT_CRITICAL_TEXT),
            stopActionText = intent.getStringExtra(EXTRA_STOP_ACTION_TEXT),
            titleSemanticStyle = if (intent.hasExtra(EXTRA_TITLE_SEMANTIC_STYLE)) intent.getIntExtra(EXTRA_TITLE_SEMANTIC_STYLE, 0) else null,
        )
        LiveRideNotifier.showProgress(context, content, staleUntil)
    }

    companion object {
        const val ACTION_STALE = "com.betterrail.liveride.STALE"
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_BODY = "body"
        private const val EXTRA_CURRENT_STOP = "currentStop"
        private const val EXTRA_TOTAL_STOPS = "totalStops"
        private const val EXTRA_PROGRESS = "progress"
        private const val EXTRA_MAX_PROGRESS = "maxProgress"
        private const val EXTRA_SHORT_CRITICAL_TEXT = "shortCriticalText"
        private const val EXTRA_STOP_ACTION_TEXT = "stopActionText"
        private const val EXTRA_UNTIL = "staleUntil"
        private const val EXTRA_TITLE_SEMANTIC_STYLE = "titleSemanticStyle"

        fun toIntent(context: Context, content: LiveRideContent, staleUntil: Long): Intent =
            Intent(context, LiveRideStaleReceiver::class.java)
                .putExtra(EXTRA_TITLE, content.title)
                .putExtra(EXTRA_BODY, content.body)
                .putExtra(EXTRA_CURRENT_STOP, content.currentStop)
                .putExtra(EXTRA_TOTAL_STOPS, content.totalStops)
                .apply {
                    content.progress?.let { putExtra(EXTRA_PROGRESS, it) }
                    content.maxProgress?.let { putExtra(EXTRA_MAX_PROGRESS, it) }
                    content.shortCriticalText?.let { putExtra(EXTRA_SHORT_CRITICAL_TEXT, it) }
                    content.stopActionText?.let { putExtra(EXTRA_STOP_ACTION_TEXT, it) }
                    content.titleSemanticStyle?.let { putExtra(EXTRA_TITLE_SEMANTIC_STYLE, it) }
                }
                .putExtra(EXTRA_UNTIL, staleUntil)
    }
}
