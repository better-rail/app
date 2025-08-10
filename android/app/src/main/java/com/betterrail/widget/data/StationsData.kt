package com.betterrail.widget.data

object StationsData {
    private val stationsMap = mapOf(
        "3700" to "Tel Aviv - Savidor Center",
        "3500" to "Herzliya",
        "3400" to "Bet Yehoshu'a",
        "3300" to "Netanya",
        "3100" to "Hadera - West",
        "2800" to "Binyamina",
        "2820" to "Caesarea-Pardes Hana",
        "2500" to "Atlit",
        "2200" to "Haifa - Bat Galim",
        "1300" to "Hutzot HaMifratz",
        "700" to "Kiryat Hayim",
        "1400" to "Kiryat Motzkin",
        "1500" to "Ako",
        "2300" to "Haifa - Hof HaKarmel",
        "8700" to "Kfar Sava - Nordau",
        "1600" to "Nahariya",
        "6300" to "Bet Shemesh",
        "7000" to "Kiryat Gat",
        "5000" to "Lod",
        "7300" to "Be'er Sheva - North/University",
        "4800" to "Kfar Habad",
        "4600" to "Tel Aviv - HaShalom",
        "2100" to "Haifa Center - HaShmona",
        "5010" to "Ramla",
        "8800" to "Rosh Ha'Ayin - North",
        "5300" to "Be'er Ya'akov",
        "5200" to "Rehovot",
        "5410" to "Yavne - East",
        "9100" to "Rishon LeTsiyon - HaRishonim",
        "5800" to "Ashdod - Ad Halom",
        "4250" to "Petah Tikva - Segula",
        "4100" to "Bnei Brak",
        "3600" to "Tel Aviv - University",
        "7320" to "Be'er Sheva - Center",
        "1220" to "HaMifrats Central Station",
        "4900" to "Tel Aviv - HaHagana",
        "8600" to "Ben Gurion Airport",
        "5900" to "Ashkelon",
        "7500" to "Dimona",
        "9200" to "Hod HaSharon - Sokolov",
        "4170" to "Petah Tikva - Kiryat Arye",
        "5150" to "Lod - Gane Aviv",
        "8550" to "Lehavim - Rahat",
        "300" to "Pa'ate Modi'in",
        "400" to "Modi'in - Center",
        "4640" to "Holon Junction",
        "4660" to "Holon - Wolfson",
        "4680" to "Bat Yam - Yoseftal",
        "4690" to "Bat Yam - Komemiyut",
        "9800" to "Rishon LeTsiyon - Moshe Dayan",
        "9000" to "Yavne - West",
        "9600" to "Sderot",
        "9650" to "Netivot",
        "9700" to "Ofakim",
        "3310" to "Netanya - Sapir",
        "1240" to "Yokne'am - Kfar Yehoshu'a",
        "1250" to "Migdal Ha'emek - Kfar Barukh",
        "1260" to "Afula R.Eitan",
        "1280" to "Beit She'an",
        "1820" to "Ahihud",
        "1840" to "Karmiel",
        "2940" to "Ra'anana West",
        "2960" to "Ra'anana South",
        "6150" to "Kiryat Malakhi – Yoav",
        "680" to "Jerusalem - Yitzhak Navon",
        "6900" to "Mazkeret Batya",
        "1680" to "Kiryat Motzkin" // Fixed mapping - this was the issue
    )

    fun getStationsForDisplay(locale: String): List<Pair<String, String>> {
        return stationsMap.map { (id, name) -> id to name }
            .sortedBy { it.second }
    }

    fun getStationName(stationId: String): String {
        return stationsMap[stationId] ?: "Unknown Station"
    }
}