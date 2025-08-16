package com.betterrail.widget.test

import android.content.Context
import android.content.SharedPreferences
import com.betterrail.BuildConfig

/**
 * Configuration for widget testing modes
 */
object TestConfig {
    private const val PREFS_NAME = "widget_test_config"
    private const val KEY_MOCK_MODE = "mock_mode_enabled"
    
    // Special test route combination that triggers mock data
    private const val TEST_ORIGIN_ID = "9999"
    private const val TEST_DESTINATION_ID = "8888"
    
    /**
     * Enable or disable mock schedule mode
     */
    fun setMockModeEnabled(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_MOCK_MODE, enabled).apply()
        android.util.Log.d("TestConfig", "Mock mode ${if (enabled) "enabled" else "disabled"}")
    }
    
    /**
     * Check if mock schedule mode is enabled globally
     */
    fun isMockModeEnabled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_MOCK_MODE, false)
    }
    
    /**
     * Check if a specific route should use mock data
     * Only available in debug builds
     */
    fun shouldUseMockData(context: Context, originId: String, destinationId: String): Boolean {
        // Mock data only available in debug builds
        if (!BuildConfig.DEBUG) {
            return false
        }
        
        // Global mock mode override
        val globalMockEnabled = isMockModeEnabled(context)
        if (globalMockEnabled) {
            android.util.Log.d("TestConfig", "Global mock mode is enabled - using mock data for $originId -> $destinationId")
            return true
        }
        
        // Special test route
        if (isTestRoute(originId, destinationId)) {
            android.util.Log.d("TestConfig", "Test route detected: $originId -> $destinationId - using mock data")
            return true
        }
        
        android.util.Log.d("TestConfig", "Regular route $originId -> $destinationId - using real API data")
        return false
    }
    
    /**
     * Check if this is the special test route
     */
    private fun isTestRoute(originId: String, destinationId: String): Boolean {
        return (originId == TEST_ORIGIN_ID && destinationId == TEST_DESTINATION_ID) ||
               (originId == TEST_DESTINATION_ID && destinationId == TEST_ORIGIN_ID)
    }
    
    /**
     * Get test route origin ID
     */
    fun getTestOriginId(): String = TEST_ORIGIN_ID
    
    /**
     * Get test route destination ID  
     */
    fun getTestDestinationId(): String = TEST_DESTINATION_ID
    
    /**
     * Initialize test config
     */
    fun enableMockModeForDebug(context: Context) {
        android.util.Log.d("TestConfig", "TestConfig initialized - use route $TEST_ORIGIN_ID -> $TEST_DESTINATION_ID for mock data")
    }
}