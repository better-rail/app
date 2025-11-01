package com.betterrail.widget.utils

import android.content.Context
import android.os.Build
import android.widget.RemoteViews
import com.betterrail.R

object WidgetRTLHelper {

    fun applyRTLAdjustments(context: Context, views: RemoteViews, layoutResource: Int) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.JELLY_BEAN_MR1) {
            return
        }

        setLayoutDirection(context, views, layoutResource)
        setArrowDirection(context, views)
    }

    private fun setLayoutDirection(context: Context, views: RemoteViews, layoutResource: Int) {
        val layoutDirection = LocaleUtils.getLayoutDirection(context)

        val containerId = when (layoutResource) {
            R.layout.widget_compact_2x2 -> R.id.widget_container_compact
            R.layout.widget_compact_4x2 -> R.id.widget_container_compact_4x2
            else -> R.id.widget_container_compact
        }

        views.setInt(containerId, "setLayoutDirection", layoutDirection)
    }

    private fun setArrowDirection(context: Context, views: RemoteViews) {
        val isRTL = LocaleUtils.isRTL(context)
        val rotationDegrees = if (isRTL) 180f else 0f
        views.setFloat(R.id.widget_arrow_icon, "setRotation", rotationDegrees)
    }
}
