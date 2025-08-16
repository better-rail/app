package com.betterrail.widget.api

import com.betterrail.BuildConfig
import com.betterrail.widget.data.*
import com.betterrail.widget.config.NetworkConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.first
import com.betterrail.widget.utils.RetryUtils
import okhttp3.*
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
        private const val MOCK_NETWORK_DELAY_MS = 500L
        private const val MOCK_TOMORROW_DELAY_MS = 300L
        private const val MINUTES_IN_HOUR = 60
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val TIME_FORMAT = SimpleDateFormat("HH:mm", Locale.getDefault())
        
        private fun getRailApiBaseUrl(): String {
            return try {
                val timeZone = java.util.TimeZone.getDefault()
                val isInIsrael = timeZone.id == "Asia/Jerusalem"
                
                if (isInIsrael) {
                    android.util.Log.d("RailApiService", "Using direct rail API (detected Israel timezone)")
                    BuildConfig.RAIL_API_TIMETABLE_URL
                } else {
                    android.util.Log.d("RailApiService", "Using proxy rail API (detected non-Israel timezone: ${timeZone.id})")
                    BuildConfig.RAIL_API_PROXY_TIMETABLE_URL
                }
            } catch (e: Exception) {
                android.util.Log.w("RailApiService", "Failed to determine timezone, falling back to direct API", e)
                BuildConfig.RAIL_API_TIMETABLE_URL
            }
        }
    }

    /**
     * Create HTTP client with configurable timeouts
     */
    private suspend fun createClient(): OkHttpClient {
        val timeouts = networkConfig.networkTimeouts.first()
        
        return OkHttpClient.Builder()
            .connectTimeout(timeouts.connectTimeoutSeconds, TimeUnit.SECONDS)
            .readTimeout(timeouts.readTimeoutSeconds, TimeUnit.SECONDS)
            .writeTimeout(timeouts.writeTimeoutSeconds, TimeUnit.SECONDS)
            .connectionPool(okhttp3.ConnectionPool(
                timeouts.connectionPoolSize, 
                timeouts.connectionKeepAliveMinutes, 
                TimeUnit.MINUTES
            )) // Reuse connections
            .retryOnConnectionFailure(true) // Auto-retry on connection failure
            // Force IPv4-only to avoid IPv6 connectivity issues
            .dns(object : okhttp3.Dns {
                override fun lookup(hostname: String): List<java.net.InetAddress> {
                    val allAddresses = java.net.InetAddress.getAllByName(hostname).toList()
                    // Filter to only include IPv4 addresses
                    val ipv4Addresses = allAddresses.filterIsInstance<java.net.Inet4Address>()
                    android.util.Log.d("RailApiService", "DNS lookup for $hostname: ${allAddresses.size} total addresses, ${ipv4Addresses.size} IPv4 addresses")
                    
                    if (ipv4Addresses.isEmpty()) {
                        android.util.Log.w("RailApiService", "No IPv4 addresses found for $hostname, falling back to all addresses")
                        return allAddresses
                    }
                    
                    return ipv4Addresses
                }
            })
            .build()
    }

    private val gson = Gson()

    suspend fun getRoutes(originId: String, destinationId: String, date: String? = null, hour: String? = null): Result<WidgetScheduleData> {
        return withContext(Dispatchers.IO) {
            try {
                val requestDate = date ?: DATE_FORMAT.format(Date())
                val requestHour = hour ?: "00:00"
                val isRequestForFutureDate = date != null && date != DATE_FORMAT.format(Date())

                val baseUrl = getRailApiBaseUrl()
                val url = "${baseUrl}searchTrainLuzForDateTime" +
                        "?fromStation=$originId" +
                        "&toStation=$destinationId" +
                        "&date=$requestDate" +
                        "&hour=$requestHour" +
                        "&scheduleType=1" +
                        "&systemType=1" +
                        "&languageId=Hebrew"

                android.util.Log.d("RailApiService", "Making API call to: $url")

                val request = Request.Builder()
                    .url(url)
                    .addHeader("Accept", "application/json")
                    .addHeader("Ocp-Apim-Subscription-Key", API_KEY)
                    .build()

                // Retry logic for network timeouts with exponential backoff
                return@withContext RetryUtils.withRetry(
                    maxRetries = MAX_RETRIES,
                    retryDelays = RetryUtils.DEFAULT_RETRY_DELAYS,
                    logTag = "RailApiService"
                ) { attempt ->
                    val client = createClient()
                    val response = client.newCall(request).execute()
                    
                    android.util.Log.d("RailApiService", "Response code: ${response.code}")
                    
                    if (!response.isSuccessful) {
                        android.util.Log.e("RailApiService", "HTTP Error: ${response.code} - ${response.message}")
                        Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                    } else {
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

            } catch (e: kotlinx.coroutines.CancellationException) {
                android.util.Log.d("RailApiService", "API request cancelled")
                throw e // Re-throw cancellation to preserve coroutine semantics
            } catch (e: Exception) {
                android.util.Log.e("RailApiService", "Unexpected error in getRoutes: ${e.message}", e)
                Result.failure(e)
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

            val routes = mutableListOf<WidgetTrainItem>()
            
            // Parse all travels to find upcoming trains
            val maxRoutes = travels.size() // Check all available travels
            android.util.Log.d("RailApiService", "Processing all $maxRoutes travels (no limit)")
            
            for (i in 0 until maxRoutes) {
                try {
                    val travel = travels[i].asJsonObject
                    android.util.Log.d("RailApiService", "Processing travel $i: ${travel.toString()}")
                    var trains: com.google.gson.JsonArray? = travel.getAsJsonArray("trains")
                    
                    // Try alternative structures
                    if (trains == null) {
                        trains = travel.getAsJsonArray("Train")
                    }
                    
                    // Get departure and arrival times from travel object first
                    val departureTime = travel.get("departureTime")?.asString ?: ""
                    val arrivalTime = travel.get("arrivalTime")?.asString ?: ""
                    
                    // Get platform, delay, and train number from first train if available
                    var originPlatform = "1"
                    var delay = 0
                    var trainNumber = ""
                    if (trains != null && trains.size() > 0) {
                        val firstTrain = trains[0].asJsonObject
                        originPlatform = firstTrain.get("originPlatform")?.asString 
                            ?: firstTrain.get("Platform")?.asString ?: "1"
                        
                        // Get train number (can be string or number in JSON)
                        trainNumber = firstTrain.get("trainNumber")?.let { element ->
                            if (element.isJsonPrimitive) {
                                element.asString
                            } else ""
                        } ?: firstTrain.get("TrainNumber")?.let { element ->
                            if (element.isJsonPrimitive) {
                                element.asString
                            } else ""
                        } ?: firstTrain.get("trainId")?.let { element ->
                            if (element.isJsonPrimitive) {
                                element.asString
                            } else ""
                        } ?: ""
                        
                        android.util.Log.d("RailApiService", "Extracted train number: '$trainNumber' from firstTrain")
                        
                        // Get delay if available
                        val trainPositionElement = firstTrain.get("trainPosition")
                        if (trainPositionElement != null && !trainPositionElement.isJsonNull) {
                            val trainPosition = trainPositionElement.asJsonObject
                            delay = trainPosition.get("calcDiffMinutes")?.asInt ?: 0
                        }
                        // Try alternative delay sources
                        if (delay == 0) {
                            delay = firstTrain.get("Delay")?.asInt ?: travel.get("Delay")?.asInt ?: 0
                        }
                    } else {
                        // No trains array, try to get platform from travel object
                        originPlatform = travel.get("platform")?.asString ?: "1"
                        // Try to get delay from travel object
                        delay = travel.get("Delay")?.asInt ?: 0
                        // Try to get train number from travel object
                        trainNumber = travel.get("trainNumber")?.asString ?: ""
                    }
                    
                    val isExchange = trains?.size()?.let { it > 1 } ?: false
                    
                    // Format times for display (HH:mm)
                    val formattedDepartureTime = formatTimeForDisplay(departureTime)
                    val formattedArrivalTime = formatTimeForDisplay(arrivalTime)
                    
                    // Calculate duration and changes text
                    val duration = calculateDuration(departureTime, arrivalTime)
                    val changesText = formatChangesText(isExchange)
                    
                    android.util.Log.d("RailApiService", "Travel $i: dep=$formattedDepartureTime, arr=$formattedArrivalTime, platform=$originPlatform, delay=${delay}min")
                    
                    if (formattedDepartureTime.isNotEmpty() && isUpcomingDeparture(formattedDepartureTime, isRequestForFutureDate)) {
                        // Use the delay calculated above, don't reset to 0
                        routes.add(
                            WidgetTrainItem(
                                departureTime = formattedDepartureTime,
                                arrivalTime = formattedArrivalTime,
                                platform = originPlatform,
                                delay = delay,
                                isExchange = isExchange,
                                duration = duration,
                                changesText = changesText,
                                trainNumber = trainNumber
                            )
                        )
                        
                        // No longer limiting to 5 trains - return all available upcoming trains
                    }
                } catch (e: Exception) {
                    // Skip this route if parsing fails
                    android.util.Log.e("RailApiService", "Failed to parse travel $i: ${e.message}", e)
                    continue
                }
            }

            android.util.Log.d("RailApiService", "Parsed ${routes.size} routes successfully")
            
            return Result.success(WidgetScheduleData(
                routes = routes,
                originName = "Station $originId", // TODO: Get actual station names
                destinationName = "Station $destinationId"
            ))
        } catch (e: Exception) {
            return Result.failure(Exception("Failed to parse API response: ${e.message}"))
        }
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
                
                // Only show trains departing from current time onwards (no past trains)
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
    
    private fun formatChangesText(isExchange: Boolean): String {
        return if (isExchange) "1 change" else "Direct"
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