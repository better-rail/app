package com.betterrail.widget.utils

import android.util.Log
import kotlinx.coroutines.delay

/**
 * Utilities for retry logic with proper cancellation handling
 */
object RetryUtils {
    val DEFAULT_RETRY_DELAYS = listOf(2000L, 5000L, 10000L)
    private const val DEFAULT_MAX_RETRIES = 3

    /**
     * Executes a retry delay with cancellation handling
     */
    suspend fun retryDelay(delayMs: Long, logTag: String = "RetryUtils") {
        try {
            delay(delayMs)
        } catch (e: kotlinx.coroutines.CancellationException) {
            Log.d(logTag, "Retry delay cancelled, stopping retries")
            throw e
        }
    }

    /**
     * Executes a block with retry logic and proper cancellation handling
     */
    suspend fun <T> withRetry(
        maxRetries: Int = DEFAULT_MAX_RETRIES,
        retryDelays: List<Long> = DEFAULT_RETRY_DELAYS,
        logTag: String = "RetryUtils",
        block: suspend (attempt: Int) -> T
    ): T {
        var lastException: Exception? = null
        
        for (attempt in 0 until maxRetries) {
            try {
                Log.d(logTag, "Attempt ${attempt + 1}/$maxRetries")
                return block(attempt)
            } catch (e: kotlinx.coroutines.CancellationException) {
                Log.d(logTag, "Request cancelled during attempt ${attempt + 1}/$maxRetries")
                throw e // Re-throw cancellation immediately
            } catch (e: java.net.SocketTimeoutException) {
                Log.w(logTag, "Socket timeout on attempt ${attempt + 1}/$maxRetries: ${e.message}")
                lastException = e
                if (attempt < maxRetries - 1) {
                    retryDelay(retryDelays[attempt], logTag)
                }
            } catch (e: java.net.ConnectException) {
                Log.w(logTag, "Connection failed on attempt ${attempt + 1}/$maxRetries: ${e.message}")
                lastException = e
                if (attempt < maxRetries - 1) {
                    retryDelay(retryDelays[attempt], logTag)
                }
            } catch (e: java.io.IOException) {
                Log.w(logTag, "IO exception on attempt ${attempt + 1}/$maxRetries: ${e.message}")
                lastException = e
                if (attempt < maxRetries - 1) {
                    retryDelay(retryDelays[attempt], logTag)
                }
            } catch (e: Exception) {
                // Non-retryable exceptions - fail immediately
                Log.e(logTag, "Non-retryable exception: ${e.message}", e)
                throw e
            }
        }
        
        // All retries exhausted
        Log.e(logTag, "All $maxRetries attempts failed, last error: ${lastException?.message}")
        throw lastException ?: Exception("All retry attempts failed")
    }
}