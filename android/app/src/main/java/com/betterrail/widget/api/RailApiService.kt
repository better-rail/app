package com.betterrail.widget.api

import com.betterrail.BuildConfig
import com.betterrail.widget.data.*
import com.betterrail.widget.config.NetworkConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonArray
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.first
import com.betterrail.widget.utils.RetryUtils
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import android.net.Uri
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class RailApiService(
    private val networkConfig: NetworkConfig
) {
    companion object {
        private val API_KEY = BuildConfig.RAIL_API_KEY
        private const val MAX_RETRIES = 3
        private const val MINUTES_IN_HOUR = 60
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val TIME_FORMAT = SimpleDateFormat("HH:mm", Locale.getDefault())
    }

    @Volatile
    private var cachedClient: OkHttpClient? = null

    /**
     * Get or create a shared HTTP client. The client is cached so that connection pooling
     * and keep-alive actually work across requests and retry attempts.
     */
    private suspend fun getOrCreateClient(): OkHttpClient {
        cachedClient?.let { return it }

        val timeouts = networkConfig.networkTimeouts.first()

        return OkHttpClient.Builder()
            .connectTimeout(timeouts.connectTimeoutSeconds, TimeUnit.SECONDS)
            .readTimeout(timeouts.readTimeoutSeconds, TimeUnit.SECONDS)
            .writeTimeout(timeouts.writeTimeoutSeconds, TimeUnit.SECONDS)
            .connectionPool(okhttp3.ConnectionPool(
                timeouts.connectionPoolSize,
                timeouts.connectionKeepAliveMinutes,
                TimeUnit.MINUTES
            ))
            .retryOnConnectionFailure(true)
            .build()
            .also { cachedClient = it }
    }

    private val gson = Gson()

    private fun buildApiUrl(baseUrl: String): String {
        return Uri.parse(baseUrl)
            .buildUpon()
            .appendPath("searchTrain")
            .build()
            .toString()
    }

    private fun createRequestBody(
        originId: String,
        destinationId: String,
        requestDate: String,
        requestHour: String
    ): RequestBody {
        val jsonBody = JsonObject().apply {
            addProperty("methodName", "searchTrainLuzForDateTime")
            addProperty("fromStation", originId.toInt())
            addProperty("toStation", destinationId.toInt())
            addProperty("date", requestDate)
            addProperty("hour", requestHour)
            addProperty("systemType", "2")
            addProperty("scheduleType", "ByDeparture")
            addProperty("languageId", "Hebrew")
        }

        return RequestBody.create(
            "application/json; charset=utf-8".toMediaType(),
            gson.toJson(jsonBody)
        )
    }

    suspend fun getRoutes(originId: String, destinationId: String, date: String? = null, hour: String? = null): Result<WidgetScheduleData> {
        return withContext(Dispatchers.IO) {
            try {
                val requestDate = date ?: DATE_FORMAT.format(Date())
                val requestHour = hour ?: "00:00"
                val isRequestForFutureDate = date != null && date != DATE_FORMAT.format(Date())

                return@withContext makeApiCall(originId, destinationId, requestDate, requestHour, isRequestForFutureDate)

            } catch (e: kotlinx.coroutines.CancellationException) {
                android.util.Log.d("RailApiService", "API request cancelled")
                throw e // Re-throw cancellation to preserve coroutine semantics
            } catch (e: Exception) {
                android.util.Log.e("RailApiService", "Unexpected error in getRoutes: ${e.message}", e)
                Result.failure(e)
            }
        }
    }
    
    private suspend fun makeApiCall(
        originId: String,
        destinationId: String,
        requestDate: String,
        requestHour: String,
        isRequestForFutureDate: Boolean
    ): Result<WidgetScheduleData> {
        val baseUrl = BuildConfig.RAIL_API_TIMETABLE_URL

        val url = buildApiUrl(baseUrl)
        val requestBody = createRequestBody(originId, destinationId, requestDate, requestHour)

        android.util.Log.d("RailApiService", "Making API call to: $url")
        android.util.Log.d("RailApiService", "Request body: ${gson.toJson(JsonObject().apply {
            addProperty("methodName", "searchTrainLuzForDateTime")
            addProperty("fromStation", originId.toInt())
            addProperty("toStation", destinationId.toInt())
            addProperty("date", requestDate)
            addProperty("hour", requestHour)
            addProperty("systemType", "2")
            addProperty("scheduleType", "ByDeparture")
            addProperty("languageId", "Hebrew")
        })}")

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .addHeader("Content-Type", "application/json")
            .addHeader("ocp-apim-subscription-key", API_KEY)
            .build()

        // Create client once before retries so connection pooling works across attempts
        val client = getOrCreateClient()

        // Retry logic for network timeouts with exponential backoff
        return RetryUtils.withRetry(
            maxRetries = MAX_RETRIES,
            retryDelays = RetryUtils.DEFAULT_RETRY_DELAYS,
            logTag = "RailApiService"
        ) { attempt ->
            val response = client.newCall(request).execute()
            
            android.util.Log.d("RailApiService", "Response code: ${response.code}")
            
            when {
                !response.isSuccessful -> {
                    android.util.Log.e("RailApiService", "HTTP Error: ${response.code} - ${response.message}")
                    Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }
                
                else -> {
                    val responseBody = response.body?.string()
                    if (responseBody.isNullOrEmpty()) {
                        android.util.Log.e("RailApiService", "Empty response body")
                        Result.failure(Exception("Empty response body"))
                    } else {
                        // Success! Process the response
                        processApiResponse(responseBody, originId, destinationId, isRequestForFutureDate)
                    }
                }
            }
        }
    }

    private fun processApiResponse(responseBody: String, originId: String, destinationId: String, isRequestForFutureDate: Boolean): Result<WidgetScheduleData> {
        try {
            android.util.Log.d("RailApiService", "Response body: ${responseBody.take(500)}...")

            // Parse the response with defensive parsing
            val jsonResponse = JsonParser.parseString(responseBody).asJsonObject
            
            // Try different possible response structures
            var travels: com.google.gson.JsonArray? = null
            
            // Check for "result.travels" structure
            val result = jsonResponse.getAsJsonObject("result")
            if (result != null) {
                travels = result.getAsJsonArray("travels")
            }
            
            // If not found, try direct "travels" or "Data.Routes"
            if (travels == null) {
                travels = jsonResponse.getAsJsonArray("travels")
            }
            if (travels == null) {
                val data = jsonResponse.getAsJsonObject("Data")
                if (data != null) {
                    travels = data.getAsJsonArray("Routes")
                }
            }
            
            if (travels == null || travels.size() == 0) {
                // No routes found, but this is not an error
                android.util.Log.d("RailApiService", "No travels/routes found in response")
                return Result.success(WidgetScheduleData(
                    routes = emptyList(),
                    originName = "Station $originId",
                    destinationName = "Station $destinationId"
                ))
            }

            android.util.Log.d("RailApiService", "Found ${travels.size()} travels in response")

            // Functional approach: map travels to routes, filter nulls
            val routes = travels.asSequence()
                .mapIndexedNotNull { index, travel -> parseTravelToRoute(travel.asJsonObject, index, isRequestForFutureDate) }
                .toList()

            android.util.Log.d("RailApiService", "Parsed ${routes.size} routes successfully")
            
            return Result.success(WidgetScheduleData(
                routes = routes,
                originName = "Station $originId",
                destinationName = "Station $destinationId"
            ))
        } catch (e: Exception) {
            return Result.failure(Exception("Failed to parse API response: ${e.message}"))
        }
    }
    
    /**
     * Parse a single travel JSON object into a WidgetTrainItem
     */
    private fun parseTravelToRoute(travel: JsonObject, index: Int, isRequestForFutureDate: Boolean): WidgetTrainItem? {
        return try {
            android.util.Log.d("RailApiService", "Processing travel $index")
            
            // Extract basic travel info
            val departureTime = travel.get("departureTime")?.asString ?: ""
            val arrivalTime = travel.get("arrivalTime")?.asString ?: ""
            val formattedDepartureTime = formatTimeForDisplay(departureTime)
            val formattedArrivalTime = formatTimeForDisplay(arrivalTime)
            
            // Skip if invalid departure time or not upcoming
            if (formattedDepartureTime.isEmpty() || !isUpcomingDeparture(formattedDepartureTime, isRequestForFutureDate)) {
                return null
            }
            
            // Extract train details from trains array or travel object
            val trains = travel.getAsJsonArray("trains") ?: travel.getAsJsonArray("Train")
            val trainDetails = extractTrainDetails(trains, travel)
            
            // Create the route item
            WidgetTrainItem(
                departureTime = formattedDepartureTime,
                arrivalTime = formattedArrivalTime,
                platform = trainDetails.platform,
                delay = trainDetails.delay,
                isExchange = trainDetails.isExchange,
                numberOfChanges = trainDetails.numberOfChanges,
                duration = calculateDuration(departureTime, arrivalTime),
                changesText = formatChangesText(trainDetails.numberOfChanges),
                trainNumber = trainDetails.trainNumber,
                departureTimestamp = departureTime
            )
        } catch (e: Exception) {
            android.util.Log.e("RailApiService", "Failed to parse travel $index: ${e.message}", e)
            null
        }
    }
    
    /**
     * Extract train details (platform, delay, number, exchange info) from JSON
     */
    private data class TrainDetails(
        val platform: String,
        val delay: Int,
        val trainNumber: String,
        val isExchange: Boolean,
        val numberOfChanges: Int
    )
    
    private fun extractTrainDetails(trains: JsonArray?, travel: JsonObject): TrainDetails {
        // Calculate number of changes: number of train segments - 1
        val numberOfChanges = if (trains != null && trains.size() > 0) {
            trains.size() - 1
        } else {
            0
        }
        val isExchange = numberOfChanges > 0

        return if (trains != null && trains.size() > 0) {
            val firstTrain = trains.get(0).asJsonObject
            TrainDetails(
                platform = firstTrain.get("originPlatform")?.asString
                    ?: firstTrain.get("Platform")?.asString ?: "1",
                delay = extractDelay(firstTrain, travel),
                trainNumber = extractTrainNumber(firstTrain, travel),
                isExchange = isExchange,
                numberOfChanges = numberOfChanges
            )
        } else {
            TrainDetails(
                platform = travel.get("platform")?.asString ?: "1",
                delay = travel.get("Delay")?.asInt ?: 0,
                trainNumber = travel.get("trainNumber")?.asString ?: "",
                isExchange = isExchange,
                numberOfChanges = numberOfChanges
            )
        }
    }
    
    private fun extractDelay(firstTrain: JsonObject, travel: JsonObject): Int {
        // Try train position delay first
        firstTrain.get("trainPosition")?.takeIf { !it.isJsonNull }?.asJsonObject?.let { position ->
            position.get("calcDiffMinutes")?.asInt?.let { return it }
        }
        
        // Try other delay sources
        return firstTrain.get("Delay")?.asInt 
            ?: travel.get("Delay")?.asInt 
            ?: 0
    }
    
    private fun extractTrainNumber(firstTrain: JsonObject, travel: JsonObject): String {
        val sources = listOf("trainNumber", "TrainNumber", "trainId")
        
        for (source in sources) {
            firstTrain.get(source)?.takeIf { it.isJsonPrimitive }?.asString?.let { 
                return it 
            }
        }
        
        return travel.get("trainNumber")?.asString ?: ""
    }
    
    private fun formatTimeForDisplay(isoTimeString: String): String {
        return try {
            if (isoTimeString.isEmpty()) return ""
            
            // Try to extract time from the string directly (safer approach)
            val parts = isoTimeString.split("T")
            if (parts.size >= 2) {
                val timePart = parts[1].split(":")
                if (timePart.size >= 2) {
                    "${timePart[0]}:${timePart[1]}"
                } else ""
            } else {
                // If no 'T' separator, try to parse as time directly
                val timeParts = isoTimeString.split(":")
                if (timeParts.size >= 2) {
                    "${timeParts[0]}:${timeParts[1]}"
                } else ""
            }
        } catch (e: Exception) {
            ""
        }
    }
    
    
    private fun isUpcomingDeparture(departureTime: String, isRequestForFutureDate: Boolean = false): Boolean {
        return try {
            if (departureTime.isEmpty()) return false
            
            // If this is a request for a future date (like tomorrow), skip time comparison
            // and return all trains since they're all in the future relative to today
            if (isRequestForFutureDate) {
                android.util.Log.d("RailApiService", "Future date request - including train at $departureTime")
                return true
            }
            
            // Get current time in HH:mm format
            val currentTime = TIME_FORMAT.format(Date())
            val currentParts = currentTime.split(":")
            val departureParts = departureTime.split(":")
            
            android.util.Log.d("RailApiService", "Time comparison - Current: $currentTime, Departure: $departureTime")
            
            if (currentParts.size >= 2 && departureParts.size >= 2) {
                val currentHour = currentParts[0].toInt()
                val currentMinute = currentParts[1].toInt()
                val departureHour = departureParts[0].toInt()
                val departureMinute = departureParts[1].toInt()
                
                // Convert to minutes since midnight for easy comparison
                val currentMinutes = currentHour * MINUTES_IN_HOUR + currentMinute
                val departureMinutes = departureHour * MINUTES_IN_HOUR + departureMinute
                
                // Simple time comparison: train is upcoming if departure time >= current time
                // Cross-day handling is now done properly by the widget using full ISO timestamps
                val isUpcoming = departureMinutes >= currentMinutes
                
                android.util.Log.d("RailApiService", "Current: ${currentMinutes}min, Departure: ${departureMinutes}min, Upcoming: $isUpcoming")
                
                return isUpcoming
            }
            
            false
        } catch (e: Exception) {
            android.util.Log.e("RailApiService", "Error comparing times: ${e.message}")
            false // If we can't parse, exclude it to be safe
        }
    }
    
    private fun calculateDuration(departureTime: String, arrivalTime: String): String {
        return try {
            if (departureTime.isEmpty() || arrivalTime.isEmpty()) return ""
            
            // Parse times assuming ISO format like "2025-08-10T07:36:00"
            val depParts = departureTime.split("T")
            val arrParts = arrivalTime.split("T")
            
            if (depParts.size >= 2 && arrParts.size >= 2) {
                val depTimePart = depParts[1].split(":")
                val arrTimePart = arrParts[1].split(":")
                
                if (depTimePart.size >= 2 && arrTimePart.size >= 2) {
                    val depMinutes = depTimePart[0].toInt() * MINUTES_IN_HOUR + depTimePart[1].toInt()
                    val arrMinutes = arrTimePart[0].toInt() * MINUTES_IN_HOUR + arrTimePart[1].toInt()
                    
                    val durationMinutes = arrMinutes - depMinutes
                    
                    if (durationMinutes >= 60) {
                        val hours = durationMinutes / 60
                        val minutes = durationMinutes % 60
                        return if (minutes == 0) "${hours}h" else "${hours}h${minutes}m"
                    } else {
                        return "${durationMinutes}m"
                    }
                }
            }
            ""
        } catch (e: Exception) {
            android.util.Log.e("RailApiService", "Error calculating duration: ${e.message}")
            ""
        }
    }
    
    private fun formatChangesText(numberOfChanges: Int): String {
        return when (numberOfChanges) {
            0 -> "Direct"
            1 -> "1 change"
            else -> "$numberOfChanges changes"
        }
    }
}

// Extension function for easier result handling
inline fun <T, R> Result<T>.fold(
    onSuccess: (T) -> R,
    onFailure: (Throwable) -> R
): R {
    return when {
        isSuccess -> onSuccess(getOrThrow())
        else -> onFailure(exceptionOrNull()!!)
    }
}