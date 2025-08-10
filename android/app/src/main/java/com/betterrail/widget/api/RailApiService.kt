package com.betterrail.widget.api

import com.betterrail.BuildConfig
import com.betterrail.widget.data.*
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class RailApiService {
    companion object {
        private val BASE_URL = BuildConfig.RAIL_API_TIMETABLE_URL
        private val API_KEY = BuildConfig.RAIL_API_KEY
        private const val TIMEOUT_SECONDS = 30L
        private val DATE_FORMAT = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        private val TIME_FORMAT = SimpleDateFormat("HH:mm", Locale.getDefault())
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .connectionPool(okhttp3.ConnectionPool(5, 2, TimeUnit.MINUTES)) // Reuse connections
        .retryOnConnectionFailure(true) // Auto-retry on connection failure
        .build()

    private val gson = Gson()

    suspend fun getRoutes(originId: String, destinationId: String, date: String? = null, hour: String? = null): Result<WidgetScheduleData> {
        return withContext(Dispatchers.IO) {
            try {
                val requestDate = date ?: DATE_FORMAT.format(Date())
                val requestHour = hour ?: "00:00"

                val url = "${BASE_URL}searchTrainLuzForDateTime" +
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

                val response = client.newCall(request).execute()
                
                android.util.Log.d("RailApiService", "Response code: ${response.code}")
                
                if (!response.isSuccessful) {
                    android.util.Log.e("RailApiService", "HTTP Error: ${response.code} - ${response.message}")
                    return@withContext Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }

                val responseBody = response.body?.string()
                if (responseBody.isNullOrEmpty()) {
                    android.util.Log.e("RailApiService", "Empty response body")
                    return@withContext Result.failure(Exception("Empty response body"))
                }

                android.util.Log.d("RailApiService", "Response body: ${responseBody.take(500)}...")

                // Parse the response with defensive parsing
                try {
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
                        return@withContext Result.success(WidgetScheduleData(
                            routes = emptyList(),
                            originName = "Station $originId",
                            destinationName = "Station $destinationId"
                        ))
                    }

                    android.util.Log.d("RailApiService", "Found ${travels.size()} travels in response")

                    val routes = mutableListOf<WidgetTrainItem>()
                    
                    // Parse all travels to find upcoming trains
                    val maxRoutes = travels.size() // Check all available travels
                    android.util.Log.d("RailApiService", "Processing $maxRoutes travels out of ${travels.size()} total")
                    
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
                            
                            // Get platform and delay from first train if available
                            var originPlatform = "1"
                            var delay = 0
                            if (trains != null && trains.size() > 0) {
                                val firstTrain = trains[0].asJsonObject
                                originPlatform = firstTrain.get("originPlatform")?.asString 
                                    ?: firstTrain.get("Platform")?.asString ?: "1"
                                
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
                            }
                            
                            val isExchange = trains?.size()?.let { it > 1 } ?: false
                            
                            // Format times for display (HH:mm)
                            val formattedDepartureTime = formatTimeForDisplay(departureTime)
                            val formattedArrivalTime = formatTimeForDisplay(arrivalTime)
                            
                            // Calculate duration and changes text
                            val duration = calculateDuration(departureTime, arrivalTime)
                            val changesText = formatChangesText(isExchange)
                            
                            android.util.Log.d("RailApiService", "Travel $i: dep=$formattedDepartureTime, arr=$formattedArrivalTime, platform=$originPlatform, delay=${delay}min")
                            
                            if (formattedDepartureTime.isNotEmpty() && isUpcomingDeparture(formattedDepartureTime)) {
                                // Use the delay calculated above, don't reset to 0
                                routes.add(
                                    WidgetTrainItem(
                                        departureTime = formattedDepartureTime,
                                        arrivalTime = formattedArrivalTime,
                                        platform = originPlatform,
                                        delay = delay,
                                        isExchange = isExchange,
                                        duration = duration,
                                        changesText = changesText
                                    )
                                )
                                
                                // Stop after finding 5 suitable trains
                                if (routes.size >= 5) break
                            }
                        } catch (e: Exception) {
                            // Skip this route if parsing fails
                            android.util.Log.e("RailApiService", "Failed to parse travel $i: ${e.message}", e)
                            continue
                        }
                    }

                    android.util.Log.d("RailApiService", "Parsed ${routes.size} routes successfully")
                    
                    Result.success(WidgetScheduleData(
                        routes = routes,
                        originName = "Station $originId", // TODO: Get actual station names
                        destinationName = "Station $destinationId"
                    ))
                } catch (e: Exception) {
                    return@withContext Result.failure(Exception("Failed to parse API response: ${e.message}"))
                }

            } catch (e: Exception) {
                Result.failure(e)
            }
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
    
    private fun isFutureOrRecentDeparture(departureTime: String): Boolean {
        return try {
            if (departureTime.isEmpty()) return false
            
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
                val currentMinutes = currentHour * 60 + currentMinute
                val departureMinutes = departureHour * 60 + departureMinute
                
                // Show trains departing in the future OR in the past 3 hours (for reference)
                // This gives context and shows recent trains if no future ones exist
                val isFutureOrRecent = departureMinutes >= (currentMinutes - 180) // 3 hours ago
                
                android.util.Log.d("RailApiService", "Current: ${currentMinutes}min, Departure: ${departureMinutes}min, Future/Recent: $isFutureOrRecent")
                
                return isFutureOrRecent
            }
            
            false
        } catch (e: Exception) {
            android.util.Log.e("RailApiService", "Error comparing times: ${e.message}")
            true // If we can't parse, include it to be safe
        }
    }
    
    private fun isUpcomingDeparture(departureTime: String): Boolean {
        return try {
            if (departureTime.isEmpty()) return false
            
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
                val currentMinutes = currentHour * 60 + currentMinute
                val departureMinutes = departureHour * 60 + departureMinute
                
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
                    val depMinutes = depTimePart[0].toInt() * 60 + depTimePart[1].toInt()
                    val arrMinutes = arrTimePart[0].toInt() * 60 + arrTimePart[1].toInt()
                    
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