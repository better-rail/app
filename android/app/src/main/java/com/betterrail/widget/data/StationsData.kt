package com.betterrail.widget.data

import android.content.Context
import com.betterrail.BuildConfig
import com.betterrail.R

data class StationInfo(
    val stringResourceId: Int,
    val imageResource: Int
)

object StationsData {
    private val productionStations = mapOf(
        "1500" to StationInfo(R.string.station_1500, R.drawable.assets_stationimages_ako),
        "1600" to StationInfo(R.string.station_1600, R.drawable.assets_stationimages_nahariya),
        "1820" to StationInfo(R.string.station_1820, R.drawable.assets_stationimages_ahihud),
        "1840" to StationInfo(R.string.station_1840, R.drawable.assets_stationimages_karmiel),
        "1400" to StationInfo(R.string.station_1400, R.drawable.assets_stationimages_kiryatmotzkin),
        "1220" to StationInfo(R.string.station_1220, R.drawable.assets_stationimages_hamifrats),
        "700" to StationInfo(R.string.station_700, R.drawable.assets_stationimages_kiryathaim),
        "2200" to StationInfo(R.string.station_2200, R.drawable.assets_stationimages_batgalim),
        "2100" to StationInfo(R.string.station_2100, R.drawable.assets_stationimages_hofhakarmel),
        "1300" to StationInfo(R.string.station_1300, R.drawable.assets_stationimages_hotzothamifratz),
        "2300" to StationInfo(R.string.station_2300, R.drawable.assets_stationimages_hofhakarmel),
        "2500" to StationInfo(R.string.station_2500, R.drawable.assets_stationimages_atlit),
        "3100" to StationInfo(R.string.station_3100, R.drawable.assets_stationimages_haderawest),
        "2820" to StationInfo(R.string.station_2820, R.drawable.assets_stationimages_caesarea),
        "2800" to StationInfo(R.string.station_2800, R.drawable.assets_stationimages_binyamina),
        "3300" to StationInfo(R.string.station_3300, R.drawable.assets_stationimages_netanya),
        "3310" to StationInfo(R.string.station_3310, R.drawable.assets_stationimages_netanyasapir),
        "3400" to StationInfo(R.string.station_3400, R.drawable.assets_stationimages_betyehoshua),
        "3500" to StationInfo(R.string.station_3500, R.drawable.assets_stationimages_herzeliya),
        "2940" to StationInfo(R.string.station_2940, R.drawable.assets_stationimages_raananawest),
        "2960" to StationInfo(R.string.station_2960, R.drawable.assets_stationimages_raananasouth),
        "8700" to StationInfo(R.string.station_8700, R.drawable.assets_stationimages_kfarsaba),
        "9200" to StationInfo(R.string.station_9200, R.drawable.assets_stationimages_hodhasharonsokolov),
        "3600" to StationInfo(R.string.station_3600, R.drawable.assets_stationimages_tlvuniversity),
        "4600" to StationInfo(R.string.station_4600, R.drawable.assets_stationimages_tlvhashalom),
        "3700" to StationInfo(R.string.station_3700, R.drawable.assets_stationimages_tlvcenter),
        "4900" to StationInfo(R.string.station_4900, R.drawable.assets_stationimages_tlvhagana),
        "4100" to StationInfo(R.string.station_4100, R.drawable.assets_stationimages_bneibrak),
        "4250" to StationInfo(R.string.station_4250, R.drawable.assets_stationimages_petahtikvasegula),
        "4170" to StationInfo(R.string.station_4170, R.drawable.assets_stationimages_kiryatarye),
        "8800" to StationInfo(R.string.station_8800, R.drawable.assets_stationimages_roshhaayin),
        "4800" to StationInfo(R.string.station_4800, R.drawable.assets_stationimages_kfarhabad),
        "8600" to StationInfo(R.string.station_8600, R.drawable.assets_stationimages_bengurion),
        "5000" to StationInfo(R.string.station_5000, R.drawable.assets_stationimages_lod),
        "5150" to StationInfo(R.string.station_5150, R.drawable.assets_stationimages_lodganeaviv),
        "5010" to StationInfo(R.string.station_5010, R.drawable.assets_stationimages_ramla),
        "5300" to StationInfo(R.string.station_5300, R.drawable.assets_stationimages_beeryaakov),
        "5200" to StationInfo(R.string.station_5200, R.drawable.assets_stationimages_rehovot),
        "5410" to StationInfo(R.string.station_5410, R.drawable.assets_stationimages_yavneeast),
        "9000" to StationInfo(R.string.station_9000, R.drawable.assets_stationimages_yavnewest),
        "5800" to StationInfo(R.string.station_5800, R.drawable.assets_stationimages_ashdod),
        "7000" to StationInfo(R.string.station_7000, R.drawable.assets_stationimages_kiryatgat),
        "7320" to StationInfo(R.string.station_7320, R.drawable.assets_stationimages_beershevacenter),
        "7300" to StationInfo(R.string.station_7300, R.drawable.assets_stationimages_beershevauniversity),
        "6300" to StationInfo(R.string.station_6300, R.drawable.assets_stationimages_beitshemesh),
        "5900" to StationInfo(R.string.station_5900, R.drawable.assets_stationimages_ashkelon),
        "7500" to StationInfo(R.string.station_7500, R.drawable.assets_stationimages_dimona),
        "8550" to StationInfo(R.string.station_8550, R.drawable.assets_stationimages_lehavim),
        "300" to StationInfo(R.string.station_300, R.drawable.assets_stationimages_paatemodiin),
        "400" to StationInfo(R.string.station_400, R.drawable.assets_stationimages_modiincenter),
        "4640" to StationInfo(R.string.station_4640, R.drawable.assets_stationimages_holonjunction),
        "4660" to StationInfo(R.string.station_4660, R.drawable.assets_stationimages_holonwolfson),
        "4680" to StationInfo(R.string.station_4680, R.drawable.assets_stationimages_batyamyoseftal),
        "4690" to StationInfo(R.string.station_4690, R.drawable.assets_stationimages_batyamyoseftal),
        "9100" to StationInfo(R.string.station_9100, R.drawable.assets_stationimages_betyehoshua),
        "9800" to StationInfo(R.string.station_9800, R.drawable.assets_stationimages_rishonmoshedayan),
        "9600" to StationInfo(R.string.station_9600, R.drawable.assets_stationimages_sderot),
        "9650" to StationInfo(R.string.station_9650, R.drawable.assets_stationimages_netivot),
        "9700" to StationInfo(R.string.station_9700, R.drawable.assets_stationimages_ofakim),
        "1240" to StationInfo(R.string.station_1240, R.drawable.assets_stationimages_yokneam),
        "1250" to StationInfo(R.string.station_1250, R.drawable.assets_stationimages_migdalhaeemek),
        "1260" to StationInfo(R.string.station_1260, R.drawable.assets_stationimages_afula),
        "1280" to StationInfo(R.string.station_1280, R.drawable.assets_stationimages_beitshean),
        "6150" to StationInfo(R.string.station_6150, R.drawable.assets_stationimages_kiryatmalachi),
        "680" to StationInfo(R.string.station_680, R.drawable.assets_stationimages_jerusalemitzhaknavon),
        "6900" to StationInfo(R.string.station_6900, R.drawable.assets_stationimages_mazkeretbatya)
    )
    
    private val debugStations = mapOf(
        // Special test stations for mock data (debug builds only)
        "9999" to StationInfo(R.string.station_9999, R.drawable.assets_railwaystation),
        "8888" to StationInfo(R.string.station_8888, R.drawable.assets_railwaystation)
    )
    
    private val stations: Map<String, StationInfo>
        get() = if (BuildConfig.DEBUG) {
            productionStations + debugStations
        } else {
            productionStations
        }

    fun getStationsForDisplay(context: Context): List<Pair<String, String>> {
        return stations.map { (id, info) -> 
            id to context.getString(info.stringResourceId)
        }.sortedBy { it.second }
    }

    fun getStationName(context: Context, stationId: String): String {
        return stations[stationId]?.let { stationInfo ->
            val resolvedName = context.getString(stationInfo.stringResourceId)
            // Debug logging to see what's happening
            android.util.Log.d("StationsData", "Station $stationId: resourceId=${stationInfo.stringResourceId}, resolved='$resolvedName', locale=${context.resources.configuration.locales}")
            resolvedName
        } ?: "Unknown Station"
    }

    fun getStationImageResource(stationId: String): Int {
        return stations[stationId]?.imageResource ?: R.drawable.assets_railwaystation
    }
}
