package com.betterrail.widget.config

import android.content.Context
import androidx.datastore.preferences.core.edit
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Extension functions for network configuration management
 */

/**
 * Reset network timeouts to defaults for debugging/troubleshooting
 */
suspend fun NetworkConfig.resetToDefaultsForDebugging() {
    resetToDefaults()
}

/**
 * Apply performance-focused timeouts
 */
suspend fun NetworkConfig.applyPerformanceSettings() {
    setConnectTimeout(5L)  // Faster connect timeout
    setReadTimeout(15L)    // Longer read timeout for data processing
    setWriteTimeout(5L)    // Standard write timeout
    setConnectionPoolSize(8)  // More connections for better performance
    setConnectionKeepAlive(3L)  // Longer keep-alive
}

/**
 * Apply conservative timeouts for slow networks
 */
suspend fun NetworkConfig.applySlowNetworkSettings() {
    setConnectTimeout(15L)  // Longer connect timeout
    setReadTimeout(30L)     // Much longer read timeout
    setWriteTimeout(15L)    // Longer write timeout
    setConnectionPoolSize(3)   // Fewer connections to reduce load
    setConnectionKeepAlive(5L)  // Longer keep-alive for reuse
}

/**
 * Apply minimal timeout settings for testing
 */
suspend fun NetworkConfig.applyTestingSettings() {
    setConnectTimeout(2L)   // Very short for quick failure detection
    setReadTimeout(5L)      // Short read timeout
    setWriteTimeout(2L)     // Short write timeout
    setConnectionPoolSize(1)   // Single connection for predictable testing
    setConnectionKeepAlive(1L)  // Short keep-alive
}

/**
 * Background coroutine helper to apply settings without blocking
 */
fun NetworkConfig.applySettingsAsync(
    scope: CoroutineScope = CoroutineScope(Dispatchers.IO),
    settings: suspend NetworkConfig.() -> Unit
) {
    scope.launch {
        settings()
    }
}