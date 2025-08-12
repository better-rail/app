package com.betterrail.widget.data

import com.google.gson.annotations.SerializedName

// Route API Models - matching the TypeScript interfaces
data class RouteRequest(
    val originId: String,
    val destinationId: String,
    val date: String,
    val hour: String? = null,
    val isArrival: Boolean = false
)

data class RouteResponse(
    @SerializedName("Data")
    val data: RouteData?
)

data class RouteData(
    @SerializedName("Routes")
    val routes: List<Route>?
)

data class Route(
    @SerializedName("IsExchange")
    val isExchange: Boolean,
    
    @SerializedName("Train")
    val train: List<Train>?,
    
    @SerializedName("EstTime")
    val estTime: String?,
    
    @SerializedName("ArrivalTime")
    val arrivalTime: String?,
    
    @SerializedName("DepartureTime")
    val departureTime: String?,
    
    @SerializedName("Delay")
    val delay: Int = 0
)

data class Train(
    @SerializedName("OriginStationId")
    val originStationId: Int,
    
    @SerializedName("DestinationStationId")
    val destinationStationId: Int,
    
    @SerializedName("DepartureTime")
    val departureTime: String,
    
    @SerializedName("ArrivalTime")
    val arrivalTime: String,
    
    @SerializedName("Platform")
    val platform: String?,
    
    @SerializedName("Delay")
    val delay: Int = 0,
    
    @SerializedName("StopStations")
    val stopStations: List<StopStation>?
)

data class StopStation(
    @SerializedName("StationId")
    val stationId: Int,
    
    @SerializedName("StationName")
    val stationName: String,
    
    @SerializedName("ArrivalTime")
    val arrivalTime: String?,
    
    @SerializedName("DepartureTime")
    val departureTime: String?,
    
    @SerializedName("Platform")
    val platform: String?
)

// Station Models
data class Station(
    val id: Int,
    val name: String,
    @SerializedName("hebrewName")
    val hebrewName: String,
    @SerializedName("arabicName")
    val arabicName: String,
    @SerializedName("russianName")
    val russianName: String,
    val latitude: Double,
    val longitude: Double
)

// Widget-specific models
data class WidgetTrainItem(
    val departureTime: String,
    val arrivalTime: String,
    val platform: String,
    val delay: Int,
    val isExchange: Boolean = false,
    val duration: String = "",
    val changesText: String = ""
)

data class WidgetScheduleData(
    val routes: List<WidgetTrainItem>,
    val originName: String,
    val destinationName: String,
    val lastUpdated: Long = System.currentTimeMillis()
)

// API Error response
data class ApiError(
    val message: String,
    val code: Int = -1
)
