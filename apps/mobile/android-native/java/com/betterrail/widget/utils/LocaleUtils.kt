package com.betterrail.widget.utils

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.util.Log
import androidx.preference.PreferenceManager
import java.util.Locale

object LocaleUtils {
    private const val TAG = "LocaleUtils"
    private const val LANGUAGE_KEY = "userLocale"

    fun getAppLanguage(context: Context): String? {
        return try {
            val defaultPrefs = PreferenceManager.getDefaultSharedPreferences(context)
            val languageCode = defaultPrefs.getString(LANGUAGE_KEY, null)
            Log.d(TAG, "Retrieved app language from default SharedPreferences: '$languageCode'")
            languageCode
        } catch (e: Exception) {
            Log.e(TAG, "Error reading app language from SharedPreferences", e)
            null
        }
    }

    fun createLocaleContext(context: Context, languageCode: String? = null): Context {
        val effectiveLanguage = languageCode ?: getAppLanguage(context)

        if (effectiveLanguage == null) {
            return context
        }

        val locale = Locale.forLanguageTag(effectiveLanguage)
        val configuration = Configuration(context.resources.configuration)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            configuration.setLocale(locale)
        } else {
            @Suppress("DEPRECATION")
            configuration.locale = locale
        }

        return context.createConfigurationContext(configuration)
    }

    fun getLocalizedString(context: Context, resourceId: Int): String {
        val localeContext = createLocaleContext(context)
        return localeContext.getString(resourceId)
    }

    fun getLocalizedString(context: Context, resourceId: Int, vararg formatArgs: Any): String {
        val localeContext = createLocaleContext(context)
        return localeContext.getString(resourceId, *formatArgs)
    }

    fun isRTL(context: Context): Boolean {
        val languageCode = getAppLanguage(context) ?: return false
        return languageCode.startsWith("he") || languageCode.startsWith("ar")
    }

    fun getLayoutDirection(context: Context): Int {
        return if (isRTL(context)) {
            android.view.View.LAYOUT_DIRECTION_RTL
        } else {
            android.view.View.LAYOUT_DIRECTION_LTR
        }
    }
}
