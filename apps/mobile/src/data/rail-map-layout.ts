/**
 * The Service Status map's layout: an octilinear schematic laid out by hand on a
 * grid, the way TfL Go draws the Tube for a phone — tall, narrow, every line
 * running horizontally, vertically or at 45°, and no geography.
 *
 * Everything here is in grid cells (CELL map units each). Every station and
 * junction is a node; every line is a route through nodes, with the
 * occasional bend point in between so each hop is straight, vertical or
 * diagonal (a test checks). Where lines share a hop they are drawn as
 * parallel lanes, ordered west to east by LANE_RANK; the model
 * (components/rail-map/rail-map-model.ts) works out the offsets, the bends
 * and the station markers from this.
 */
import type { RailLineId } from "./rail-lines"

/** Map units per grid cell. The finished drawing is about 100 units wide. */
export const CELL = 4

export type LabelSide = "left" | "right" | "above" | "below"

export type MapNode = {
  x: number
  y: number
  /** Which side of the station the name should go, if it fits there (see placeLabels); junctions have none. */
  label?: LabelSide
}

/** A bend point inside a hop, in cells. */
export type Waypoint = [number, number]
/** A route: node ids (stations and junctions) with bend points between them. */
export type Route = (string | Waypoint)[]

export const JUNCTION_MODIIN = "j-modiin"
/** Where the Karmiel pair crosses onto the west of the trunk, north of Kiryat Motzkin. */
export const JUNCTION_KARMIEL = "j-karmiel"

/**
 * Where everything sits. The coast runs down the left; the trunk is the column
 * at x = 10 from Nahariya to Be'er Sheva; branches go off it east and west.
 */
export const NODES: Record<string, MapNode> = {
  // Galilee and the Krayot
  "1600": { x: 10, y: 0, label: "left" }, // Nahariya
  "1500": { x: 10, y: 1.5, label: "left" }, // Akko
  "1840": { x: 17, y: 1, label: "right" }, // Karmiel
  "1820": { x: 13, y: 1, label: "above" }, // Ahihud
  [JUNCTION_KARMIEL]: { x: 10, y: 3 },
  "1400": { x: 10, y: 5, label: "left" }, // Kiryat Motzkin
  "700": { x: 10, y: 7, label: "left" }, // Kiryat Hayim
  "1300": { x: 10, y: 9, label: "left" }, // Hutzot HaMifratz
  "1220": { x: 10, y: 11, label: "left" }, // HaMifrats Central
  // Haifa
  "2100": { x: 10, y: 13, label: "left" }, // Haifa Center - HaShmona
  "2200": { x: 10, y: 15, label: "left" }, // Bat Galim
  "2300": { x: 10, y: 17, label: "left" }, // Hof HaKarmel
  // The valley line
  "1240": { x: 14, y: 13, label: "below" }, // Yokne'am - Kfar Yehoshu'a
  "1250": { x: 17, y: 13, label: "above" }, // Migdal Ha'emek - Kfar Barukh
  "1260": { x: 20, y: 13, label: "below" }, // Afula
  "1280": { x: 23, y: 13, label: "above" }, // Beit She'an
  // The coast
  "2500": { x: 10, y: 20, label: "left" }, // Atlit
  "2800": { x: 10, y: 23, label: "left" }, // Binyamina
  "2820": { x: 10, y: 25, label: "left" }, // Caesarea - Pardes Hana
  "3100": { x: 10, y: 27, label: "left" }, // Hadera - West
  "3300": { x: 10, y: 30, label: "left" }, // Netanya
  "3310": { x: 10, y: 32, label: "left" }, // Netanya - Sapir
  "3400": { x: 10, y: 34, label: "left" }, // Bet Yehoshu'a
  "3500": { x: 10, y: 37, label: "left" }, // Herzliya
  // The eastern line
  "3900": { x: 22, y: 27, label: "right" }, // Hadera - East
  "4300": { x: 22, y: 31, label: "right" }, // Shomron - Tayibe
  "4310": { x: 22, y: 34, label: "right" }, // Tira - Kokhav Ya'ir
  "8800": { x: 21, y: 38, label: "right" }, // Rosh Ha'Ayin - North
  // The Sharon loop
  "2940": { x: 13, y: 35, label: "below" }, // Ra'anana West
  "2960": { x: 15, y: 35, label: "above" }, // Ra'anana South
  "9200": { x: 17, y: 35, label: "below" }, // Hod HaSharon - Sokolov
  "8700": { x: 19, y: 35, label: "above" }, // Kfar Sava - Nordau
  "4250": { x: 17, y: 40, label: "below" }, // Petah Tikva - Segula
  "4170": { x: 15, y: 40, label: "above" }, // Petah Tikva - Kiryat Arye
  "4100": { x: 13, y: 40, label: "below" }, // Bnei Brak
  // Tel Aviv
  "3600": { x: 10, y: 40, label: "left" }, // University
  "3700": { x: 10, y: 42, label: "left" }, // Savidor Center
  "4600": { x: 10, y: 44, label: "left" }, // HaShalom
  "4900": { x: 10, y: 46, label: "left" }, // HaHagana
  // Holon, Bat Yam and Rishon LeTsiyon
  "4640": { x: 7, y: 49, label: "left" }, // Holon Junction
  "4660": { x: 5, y: 51, label: "left" }, // Holon - Wolfson
  "4680": { x: 4, y: 52, label: "left" }, // Bat Yam - Yoseftal
  "4690": { x: 4, y: 54, label: "left" }, // Bat Yam - Komemiyut
  "9800": { x: 4, y: 56, label: "left" }, // Rishon LeTsiyon - Moshe Dayan
  "9100": { x: 6, y: 53, label: "above" }, // Rishon LeTsiyon - HaRishonim
  // Lod, Ramla and the airport
  "4800": { x: 10, y: 49.5, label: "right" }, // Kfar Habad
  "5150": { x: 10, y: 51, label: "right" }, // Lod - Gane Aviv
  "5000": { x: 10, y: 53, label: "right" }, // Lod
  "5010": { x: 10, y: 55, label: "right" }, // Ramla
  "8600": { x: 13, y: 49, label: "right" }, // Ben Gurion Airport
  [JUNCTION_MODIIN]: { x: 15, y: 51 },
  "300": { x: 17, y: 50, label: "below" }, // Pa'ate Modi'in
  "400": { x: 20, y: 50, label: "right" }, // Modi'in - Center
  "680": { x: 21, y: 53, label: "right" }, // Jerusalem - Yitzhak Navon
  "6300": { x: 16, y: 58, label: "right" }, // Bet Shemesh
  // Rehovot and the southern coast
  "5300": { x: 8, y: 55, label: "left" }, // Be'er Ya'akov
  "5200": { x: 8, y: 57, label: "left" }, // Rehovot
  "5410": { x: 8, y: 61, label: "left" }, // Yavne - East
  "9000": { x: 4, y: 61, label: "left" }, // Yavne - West
  "5800": { x: 6, y: 63, label: "left" }, // Ashdod - Ad Halom
  "5900": { x: 6, y: 66, label: "left" }, // Ashkelon
  "9600": { x: 6, y: 69, label: "left" }, // Sderot
  "9650": { x: 6, y: 72, label: "left" }, // Netivot
  "9700": { x: 6, y: 75, label: "left" }, // Ofakim
  // The south
  "6900": { x: 10, y: 59, label: "right" }, // Mazkeret Batya
  "6150": { x: 10, y: 63, label: "right" }, // Kiryat Malakhi - Yoav
  "7000": { x: 10, y: 67, label: "right" }, // Kiryat Gat
  "8550": { x: 10, y: 73, label: "right" }, // Lehavim - Rahat
  "7300": { x: 10, y: 79, label: "left" }, // Be'er Sheva - North/University
  "7320": { x: 10, y: 81, label: "left" }, // Be'er Sheva - Center
  "7500": { x: 14, y: 83, label: "right" }, // Dimona
}

// Stretches several lines share, so their bends are written once.
const HAIFA_TO_HERZLIYA: Route = ["1220", "2100", "2200", "2300", "2500", "2800", "2820", "3100", "3300", "3310", "3400", "3500"]
const TEL_AVIV: Route = ["3600", "3700", "4600", "4900"]
const TO_LOD: Route = ["4800", "5150", "5000"]
const TO_BEER_SHEVA: Route = ["5010", "6900", "6150", "7000", "8550", "7300", "7320"]
// Bends sit clear of the stations, so the markers there are on straight track.
const KARMIEL: Route = ["1840", "1820", [12, 1], JUNCTION_KARMIEL, "1400"]
const NAHARIYA: Route = ["1600", "1500", JUNCTION_KARMIEL, "1400", "700", "1300"]
const TO_ASHKELON_FROM_LOD: Route = ["5300", "5200", "5410", "5800", "5900"]

/**
 * Every line's way through the nodes, calling or not (the stations a line runs
 * through without calling are the route's stations missing from its
 * catalogue corridor). Bend points keep every hop octilinear.
 */
export const ROUTES: Record<RailLineId, Route> = {
  "1": [...NAHARIYA, ...HAIFA_TO_HERZLIYA, ...TEL_AVIV, "8600", JUNCTION_MODIIN, [16, 50], "300", "400"],
  "2": ["2800", "2820", "3100", "3300", "3310", "3400", "3500", ...TEL_AVIV, ...TO_LOD, ...TO_ASHKELON_FROM_LOD],
  "3": [...NAHARIYA, ...HAIFA_TO_HERZLIYA, ...TEL_AVIV, ...TO_LOD, ...TO_BEER_SHEVA],
  "3X": [...KARMIEL, "700", "1300", ...HAIFA_TO_HERZLIYA, ...TEL_AVIV, ...TO_LOD, ...TO_BEER_SHEVA],
  "4": [...KARMIEL, "700", "1300", "1220", "2100", "2200", "2300"],
  "5": ["3300", "3310", "3400", "3500", ...TEL_AVIV, ...TO_LOD, "5010", [13, 58], "6300"],
  "25": ["3300", "3310", "3400", "3500", ...TEL_AVIV, ...TO_LOD, "5300", "5200"],
  "6": [
    "3500",
    [11, 36],
    [12, 35],
    "2940",
    "2960",
    "9200",
    "8700",
    [21, 37],
    "8800",
    [19, 40],
    "4250",
    "4170",
    "4100",
    ...TEL_AVIV,
    "4640",
    "4660",
    "4680",
    "4690",
    "9800",
    "9000",
    "5800",
    "5900",
    "9600",
    "9650",
    "9700",
    "7300",
    "7320",
  ],
  "7": ["3500", ...TEL_AVIV, "8600", JUNCTION_MODIIN, [17, 53], "680"],
  "12": ["3900", "4300", "4310", [22, 37], "8800"],
  "9": ["5000", "9100"],
  "10": ["400", "300", [16, 50], JUNCTION_MODIIN, [17, 53], "680"],
  "11": ["1280", "1260", "1250", "1240", [12, 11], "1220", "2100", "2200", "2300", "2500"],
  "8": ["7300", "7500"],
}

/**
 * The order of the lanes where lines share a hop, west to east (south to
 * north on a horizontal hop, as seen going away from Nahariya), after the
 * Israel Railways network map: every line starts and ends at the edge of its
 * bundle, so no lane moves when one joins or leaves. Lines of one colour
 * share a lane (5 and 25).
 */
export const LANE_RANK: Record<RailLineId, number> = {
  "9": -3,
  "6": -2,
  "5": -1,
  "25": -1,
  "2": 0,
  "4": 0.5,
  "3X": 1,
  "3": 2,
  "1": 3,
  "7": 4,
  "10": 7,
  "11": 8,
  "12": 8,
  "8": 9,
}

/**
 * Where a line's lane differs from LANE_RANK: on the hops between the listed
 * nodes, and at those nodes. The Sharon loop leaves Herzliya on the east; at
 * the airport lines 1 and 7 swap under the station (line 1 turns north for
 * Modi'in at the junction beyond it); line 5 crosses to the east of the Lod
 * bundle after Lod, for Bet Shemesh; and the Modi'in pair keeps line 10
 * inside the junction's fork.
 */
export const LANE_RANK_OVERRIDES: { lineId: RailLineId; nodes: string[]; rank: number }[] = [
  { lineId: "6", nodes: ["3500"], rank: 100 },
  { lineId: "5", nodes: ["5000", "5010", "6300"], rank: 2.5 },
  { lineId: "7", nodes: ["8600", JUNCTION_MODIIN], rank: 2.5 },
  { lineId: "10", nodes: [JUNCTION_MODIIN, "300", "400"], rank: 2.9 },
]

export type CityFrame = {
  id: string
  /** The stations inside the frame; they drop the city from their names ("Tel Aviv - HaShalom" → "HaShalom"). */
  stations: string[]
  name: { he: string; en: string; ru: string; ar: string }
}

/** The rounded frames around the big cities' stations, named once, as the railways' map draws them. */
export const CITY_FRAMES: CityFrame[] = [
  { id: "haifa", stations: ["2100", "2200", "2300"], name: { he: "חיפה", en: "Haifa", ru: "Хайфа", ar: "حيفا" } },
  {
    id: "telaviv",
    stations: ["3600", "3700", "4600", "4900"],
    name: { he: "תל אביב", en: "Tel Aviv", ru: "Тель-Авив", ar: "تل أبيب" },
  },
  { id: "jerusalem", stations: ["680"], name: { he: "ירושלים", en: "Jerusalem", ru: "Иерусалим", ar: "القدس" } },
  {
    id: "beersheva",
    stations: ["7300", "7320"],
    name: { he: "באר שבע", en: "Be'er Sheva", ru: "Беэр-Шева", ar: "بئر السبع" },
  },
]

/** The one name the map shortens: the airport, which gets the aeroplane glyph beside it as well. */
export const MAP_NAME_OVERRIDES: Record<string, Record<"he" | "en" | "ru" | "ar", string>> = {
  "8600": { he: "נתב״ג", en: "TLV Airport", ru: "Аэропорт TLV", ar: "مطار TLV" },
}

/** The aeroplane beside Ben Gurion Airport's name: which station, and the glyph's height in cells. */
export const AIRPORT = { stationId: "8600", height: 0.75 }
