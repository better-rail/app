package com.betterrail.liveride

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

/** Ends a ride on the server after it was stopped from the notification, retrying until there's a network. */
class EndRideWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val rideId = inputData.getString(KEY_RIDE_ID) ?: return Result.failure()
        val baseUrl = inputData.getString(KEY_BASE_URL) ?: return Result.failure()

        val status = try {
            deleteRide(baseUrl, rideId)
        } catch (e: IOException) {
            null
        }

        val shouldRetry = status == null || status == 429 || status >= 500
        return when {
            !shouldRetry -> Result.success()
            runAttemptCount + 1 < MAX_ATTEMPTS -> Result.retry()
            else -> Result.failure()
        }
    }

    private fun deleteRide(baseUrl: String, rideId: String): Int {
        val conn = (URL("$baseUrl/ride").openConnection() as HttpURLConnection).apply {
            requestMethod = "DELETE"
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            connectTimeout = 15_000
            readTimeout = 15_000
        }
        try {
            conn.outputStream.use { os ->
                os.write(JSONObject().put("rideId", rideId).toString().toByteArray(Charsets.UTF_8))
            }
            return conn.responseCode
        } finally {
            conn.disconnect()
        }
    }

    companion object {
        private const val KEY_RIDE_ID = "rideId"
        private const val KEY_BASE_URL = "baseUrl"
        private const val MAX_ATTEMPTS = 5

        fun enqueue(context: Context, baseUrl: String, rideId: String) {
            val request = OneTimeWorkRequestBuilder<EndRideWorker>()
                .setInputData(workDataOf(KEY_RIDE_ID to rideId, KEY_BASE_URL to baseUrl))
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork("end-ride-$rideId", ExistingWorkPolicy.KEEP, request)
        }
    }
}
