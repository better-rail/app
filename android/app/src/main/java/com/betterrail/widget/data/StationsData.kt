package com.betterrail.widget.data

import com.betterrail.R

data class StationInfo(
    val name: String,
    val imageResource: Int
)

object StationsData {
    private val stations = mapOf(
        "1500" to StationInfo("Ako", R.drawable.assets_stationimages_ako),
        "1600" to StationInfo("Nahariya", R.drawable.assets_stationimages_nahariya),
        "1820" to StationInfo("Ahihud", R.drawable.assets_stationimages_ahihud),
        "1840" to StationInfo("Karmiel", R.drawable.assets_stationimages_karmiel),
        "1400" to StationInfo("Kiryat Motzkin", R.drawable.assets_stationimages_kiryatmotzkin),
        "1220" to StationInfo("HaMifrats Central Station", R.drawable.assets_stationimages_hamifrats),
        "700" to StationInfo("Kiryat Hayim", R.drawable.assets_stationimages_kiryathaim),
        "2200" to StationInfo("Haifa - Bat Galim", R.drawable.assets_stationimages_batgalim),
        "2100" to StationInfo("Haifa Center - HaShmona", R.drawable.assets_stationimages_hofhakarmel),
        "1300" to StationInfo("Hutzot HaMifratz", R.drawable.assets_stationimages_hotzothamifratz),
        "2300" to StationInfo("Haifa - Hof HaKarmel", R.drawable.assets_stationimages_hofhakarmel),
        "2500" to StationInfo("Atlit", R.drawable.assets_stationimages_atlit),
        "3100" to StationInfo("Hadera - West", R.drawable.assets_stationimages_haderawest),
        "2820" to StationInfo("Caesarea-Pardes Hana", R.drawable.assets_stationimages_caesarea),
        "2800" to StationInfo("Binyamina", R.drawable.assets_stationimages_binyamina),
        "3300" to StationInfo("Netanya", R.drawable.assets_stationimages_netanya),
        "3310" to StationInfo("Netanya - Sapir", R.drawable.assets_stationimages_netanyasapir),
        "3400" to StationInfo("Bet Yehoshu'a", R.drawable.assets_stationimages_betyehoshua),
        "3500" to StationInfo("Herzliya", R.drawable.assets_stationimages_herzeliya),
        "2940" to StationInfo("Ra'anana West", R.drawable.assets_stationimages_raananawest),
        "2960" to StationInfo("Ra'anana South", R.drawable.assets_stationimages_raananasouth),
        "8700" to StationInfo("Kfar Sava - Nordau", R.drawable.assets_stationimages_kfarsaba),
        "9200" to StationInfo("Hod HaSharon - Sokolov", R.drawable.assets_stationimages_hodhasharonsokolov),
        "3600" to StationInfo("Tel Aviv - University", R.drawable.assets_stationimages_tlvuniversity),
        "4600" to StationInfo("Tel Aviv - HaShalom", R.drawable.assets_stationimages_tlvhashalom),
        "3700" to StationInfo("Tel Aviv - Savidor Center", R.drawable.assets_stationimages_tlvcenter),
        "4900" to StationInfo("Tel Aviv - HaHagana", R.drawable.assets_stationimages_tlvhagana),
        "4100" to StationInfo("Bnei Brak", R.drawable.assets_stationimages_bneibrak),
        "4250" to StationInfo("Petah Tikva - Segula", R.drawable.assets_stationimages_petahtikvasegula),
        "4170" to StationInfo("Petah Tikva - Kiryat Arye", R.drawable.assets_stationimages_kiryatarye),
        "8800" to StationInfo("Rosh Ha'Ayin - North", R.drawable.assets_stationimages_roshhaayin),
        "4800" to StationInfo("Kfar Habad", R.drawable.assets_stationimages_kfarhabad),
        "8600" to StationInfo("Ben Gurion Airport", R.drawable.assets_stationimages_bengurion),
        "5000" to StationInfo("Lod", R.drawable.assets_stationimages_lod),
        "5150" to StationInfo("Lod - Gane Aviv", R.drawable.assets_stationimages_lodganeaviv),
        "5010" to StationInfo("Ramla", R.drawable.assets_stationimages_ramla),
        "5300" to StationInfo("Be'er Ya'akov", R.drawable.assets_stationimages_beeryaakov),
        "5200" to StationInfo("Rehovot", R.drawable.assets_stationimages_rehovot),
        "5410" to StationInfo("Yavne - East", R.drawable.assets_stationimages_yavneeast),
        "9000" to StationInfo("Yavne - West", R.drawable.assets_stationimages_yavnewest),
        "5800" to StationInfo("Ashdod - Ad Halom", R.drawable.assets_stationimages_ashdod),
        "7000" to StationInfo("Kiryat Gat", R.drawable.assets_stationimages_kiryatgat),
        "7320" to StationInfo("Be'er Sheva - Center", R.drawable.assets_stationimages_beershevacenter),
        "7300" to StationInfo("Be'er Sheva - North/University", R.drawable.assets_stationimages_beershevauniversity),
        "6300" to StationInfo("Bet Shemesh", R.drawable.assets_stationimages_beitshemesh),
        "5900" to StationInfo("Ashkelon", R.drawable.assets_stationimages_ashkelon),
        "7500" to StationInfo("Dimona", R.drawable.assets_stationimages_dimona),
        "8550" to StationInfo("Lehavim - Rahat", R.drawable.assets_stationimages_lehavim),
        "300" to StationInfo("Pa'ate Modi'in", R.drawable.assets_stationimages_paatemodiin),
        "400" to StationInfo("Modi'in - Center", R.drawable.assets_stationimages_modiincenter),
        "4640" to StationInfo("Holon Junction", R.drawable.assets_stationimages_holonjunction),
        "4660" to StationInfo("Holon - Wolfson", R.drawable.assets_stationimages_holonwolfson),
        "4680" to StationInfo("Bat Yam - Yoseftal", R.drawable.assets_stationimages_batyamyoseftal),
        "4690" to StationInfo("Bat Yam - Komemiyut", R.drawable.assets_stationimages_batyamyoseftal),
        "9100" to StationInfo("Rishon LeTsiyon - HaRishonim", R.drawable.assets_stationimages_betyehoshua),
        "9800" to StationInfo("Rishon LeTsiyon - Moshe Dayan", R.drawable.assets_stationimages_rishonmoshedayan),
        "9600" to StationInfo("Sderot", R.drawable.assets_stationimages_sderot),
        "9650" to StationInfo("Netivot", R.drawable.assets_stationimages_netivot),
        "9700" to StationInfo("Ofakim", R.drawable.assets_stationimages_ofakim),
        "1240" to StationInfo("Yokne'am - Kfar Yehoshu'a", R.drawable.assets_stationimages_yokneam),
        "1250" to StationInfo("Migdal Ha'emek - Kfar Barukh", R.drawable.assets_stationimages_migdalhaeemek),
        "1260" to StationInfo("Afula R.Eitan", R.drawable.assets_stationimages_afula),
        "1280" to StationInfo("Beit She'an", R.drawable.assets_stationimages_beitshean),
        "6150" to StationInfo("Kiryat Malakhi – Yoav", R.drawable.assets_stationimages_kiryatmalachi),
        "680" to StationInfo("Jerusalem - Yitzhak Navon", R.drawable.assets_stationimages_jerusalemitzhaknavon),
        "6900" to StationInfo("Mazkeret Batya", R.drawable.assets_stationimages_mazkeretbatya)
    )

    fun getStationsForDisplay(locale: String): List<Pair<String, String>> {
        return stations.map { (id, info) -> id to info.name }
            .sortedBy { it.second }
    }

    fun getStationName(stationId: String): String {
        return stations[stationId]?.name ?: "Unknown Station"
    }

    fun getStationImageResource(stationId: String): Int {
        return stations[stationId]?.imageResource ?: R.drawable.assets_stationimages_betyehoshua
    }
}
