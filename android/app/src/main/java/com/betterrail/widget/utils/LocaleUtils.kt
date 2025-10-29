package com.betterrail.widget.utils

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.util.Log
import java.util.Locale

/**
 * Utility for creating locale-aware contexts for widget internationalization
 * Reads the app's language preference from SharedPreferences to ensure widgets
 * display in the same language as the main app.
 */
object LocaleUtils {
    private const val TAG = "LocaleUtils"
    private const val LANGUAGE_KEY = "userLocale"

    /**
     * Gets the app's language setting from SharedPreferences
     * Falls back to system locale if not set
     *
     * @param context The context
     * @return The language code (e.g., "he", "en", "ar", "ru") or null for system default
     */
    fun getAppLanguage(context: Context): String? {
        return try {
            // The react-native-default-preference library uses Android's default SharedPreferences
            val defaultPrefs = android.preference.PreferenceManager.getDefaultSharedPreferences(context)
            val languageCode = defaultPrefs.getString(LANGUAGE_KEY, null)
            Log.d(TAG, "Retrieved app language from default SharedPreferences: '$languageCode'")
            languageCode
        } catch (e: Exception) {
            Log.e(TAG, "Error reading app language from SharedPreferences", e)
            null
        }
    }

    /**
     * Creates a context with a specific locale override
     * If languageCode is null, uses the app's language setting from SharedPreferences
     *
     * @param context The base context
     * @param languageCode The language code to override (e.g., "he", "en"), or null to use app language
     * @return A context configured with the specified locale
     */
    fun createLocaleContext(context: Context, languageCode: String? = null): Context {
        // Get the language - either from parameter or from app settings
        val effectiveLanguage = languageCode ?: getAppLanguage(context)

        if (effectiveLanguage == null) {
            // No app language set - return original context with system locale
            return context
        }

        val locale = Locale(effectiveLanguage)
        val configuration = Configuration(context.resources.configuration)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            configuration.setLocale(locale)
        } else {
            @Suppress("DEPRECATION")
            configuration.locale = locale
        }

        return context.createConfigurationContext(configuration)
    }

    /**
     * Gets a localized string resource using the app's language setting
     *
     * @param context The base context
     * @param resourceId The string resource ID
     * @return The localized string
     */
    fun getLocalizedString(context: Context, resourceId: Int): String {
        val localeContext = createLocaleContext(context)
        return localeContext.getString(resourceId)
    }

    /**
     * Gets a localized string resource with format arguments using the app's language setting
     *
     * @param context The base context
     * @param resourceId The string resource ID
     * @param formatArgs The format arguments
     * @return The localized formatted string
     */
    fun getLocalizedString(context: Context, resourceId: Int, vararg formatArgs: Any): String {
        val localeContext = createLocaleContext(context)
        return localeContext.getString(resourceId, *formatArgs)
    }
}
