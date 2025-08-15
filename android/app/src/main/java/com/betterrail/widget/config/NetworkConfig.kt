package com.betterrail.widget.config

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.networkConfigDataStore: DataStore<Preferences> by preferencesDataStore(name = "network_config")

/**
 * Configuration for network timeouts and connection settings
 */
@Singleton
class NetworkConfig @Inject constructor(
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: Context
) {
    companion object {
        // Default timeout values (in seconds)
        private const val DEFAULT_CONNECT_TIMEOUT_SECONDS = 10L
        private const val DEFAULT_READ_TIMEOUT_SECONDS = 10L
        private const val DEFAULT_WRITE_TIMEOUT_SECONDS = 10L
        private const val DEFAULT_CONNECTION_POOL_SIZE = 5
        private const val DEFAULT_CONNECTION_KEEP_ALIVE_MINUTES = 2L
        
        // Preference keys
        private val CONNECT_TIMEOUT_KEY = longPreferencesKey("connect_timeout_seconds")
        private val READ_TIMEOUT_KEY = longPreferencesKey("read_timeout_seconds")
        private val WRITE_TIMEOUT_KEY = longPreferencesKey("write_timeout_seconds")
        private val CONNECTION_POOL_SIZE_KEY = longPreferencesKey("connection_pool_size")
        private val CONNECTION_KEEP_ALIVE_KEY = longPreferencesKey("connection_keep_alive_minutes")
    }
    
    /**
     * Network timeout configuration data class
     */
    data class NetworkTimeouts(
        val connectTimeoutSeconds: Long = DEFAULT_CONNECT_TIMEOUT_SECONDS,
        val readTimeoutSeconds: Long = DEFAULT_READ_TIMEOUT_SECONDS,
        val writeTimeoutSeconds: Long = DEFAULT_WRITE_TIMEOUT_SECONDS,
        val connectionPoolSize: Int = DEFAULT_CONNECTION_POOL_SIZE,
        val connectionKeepAliveMinutes: Long = DEFAULT_CONNECTION_KEEP_ALIVE_MINUTES
    )
    
    /**
     * Get current network timeouts as Flow
     */
    val networkTimeouts: Flow<NetworkTimeouts> = context.networkConfigDataStore.data.map { preferences ->
        NetworkTimeouts(
            connectTimeoutSeconds = preferences[CONNECT_TIMEOUT_KEY] ?: DEFAULT_CONNECT_TIMEOUT_SECONDS,
            readTimeoutSeconds = preferences[READ_TIMEOUT_KEY] ?: DEFAULT_READ_TIMEOUT_SECONDS,
            writeTimeoutSeconds = preferences[WRITE_TIMEOUT_KEY] ?: DEFAULT_WRITE_TIMEOUT_SECONDS,
            connectionPoolSize = (preferences[CONNECTION_POOL_SIZE_KEY] ?: DEFAULT_CONNECTION_POOL_SIZE.toLong()).toInt(),
            connectionKeepAliveMinutes = preferences[CONNECTION_KEEP_ALIVE_KEY] ?: DEFAULT_CONNECTION_KEEP_ALIVE_MINUTES
        )
    }
    
    /**
     * Update connect timeout
     */
    suspend fun setConnectTimeout(timeoutSeconds: Long) {
        context.networkConfigDataStore.edit { preferences ->
            preferences[CONNECT_TIMEOUT_KEY] = timeoutSeconds.coerceIn(1L, 60L) // 1-60 seconds
        }
    }
    
    /**
     * Update read timeout
     */
    suspend fun setReadTimeout(timeoutSeconds: Long) {
        context.networkConfigDataStore.edit { preferences ->
            preferences[READ_TIMEOUT_KEY] = timeoutSeconds.coerceIn(5L, 120L) // 5-120 seconds
        }
    }
    
    /**
     * Update write timeout
     */
    suspend fun setWriteTimeout(timeoutSeconds: Long) {
        context.networkConfigDataStore.edit { preferences ->
            preferences[WRITE_TIMEOUT_KEY] = timeoutSeconds.coerceIn(5L, 60L) // 5-60 seconds
        }
    }
    
    /**
     * Update connection pool size
     */
    suspend fun setConnectionPoolSize(poolSize: Int) {
        context.networkConfigDataStore.edit { preferences ->
            preferences[CONNECTION_POOL_SIZE_KEY] = poolSize.coerceIn(1, 20).toLong() // 1-20 connections
        }
    }
    
    /**
     * Update connection keep-alive duration
     */
    suspend fun setConnectionKeepAlive(minutes: Long) {
        context.networkConfigDataStore.edit { preferences ->
            preferences[CONNECTION_KEEP_ALIVE_KEY] = minutes.coerceIn(1L, 10L) // 1-10 minutes
        }
    }
    
    /**
     * Reset all timeouts to defaults
     */
    suspend fun resetToDefaults() {
        context.networkConfigDataStore.edit { preferences ->
            preferences.clear()
        }
    }
    
    /**
     * Get current timeouts synchronously (for initialization)
     * Returns defaults if no configuration is saved
     */
    fun getDefaultTimeouts(): NetworkTimeouts = NetworkTimeouts()
}