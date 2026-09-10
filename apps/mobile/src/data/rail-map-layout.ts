/**
 * Schematic layout of the Israel Railways network for the Service Status map.
 *
 * A transcription of Constantine Konovalov's "Israeli railways map" (v1.4,
 * November 2022, CC BY-SA 4.0 — https://ckonovalov.com/rail): every station
 * and bend below was measured on the original 1732 × 6061 px artwork and is
 * kept in those pixel coordinates (see `px`), so the drawn shapes match it.
 * Two things differ from the original on purpose: the line set follows the
 * current timetable (see rail-lines.ts), and the eastern line from Hadera East
 * to Rosh Ha'Ayin North, which opened after the map was drawn, is added in
 * the same style.
 *
 * Nodes are the app's "3700"-style station ids, plus `J_*` waypoints where a
 * line bends or a branch leaves the trunk. Edges are physical track adjacency;
 * a line's drawn path is the shortest route through this graph between its
 * consecutive calling points, so trains that skip stations still follow the
 * track (see rail-map-model.ts).
 */
import type { RailLineId } from "./rail-lines"

export type LabelSide = "left" | "right" | "above" | "below"

export type MapNode = {
  id: string
  x: number
  y: number
  /** Where the station name goes relative to the marker; omitted for junction waypoints. */
  label?: LabelSide
  /** Smaller type, for the tight spots where the original also sets its labels small. */
  small?: boolean
  /** Nudge of the label anchor, in layout units, where the default placement would sit on a line. */
  labelOffset?: { x: number; y: number }
  /** Show only the station part of a "City - Station" name (the original boxes the city name once). */
  stationNameOnly?: boolean
}

/** Layout units: the original artwork scaled to 100 units wide. */
const PX_PER_UNIT = 17.32

/** Width/height of the map in layout units (the original's 1732 × 6061 px). */
export const MAP_BOUNDS = { width: 100, height: 350 }

/** A node placed at the original's pixel coordinates. */
const px = (id: string, x: number, y: number, label?: LabelSide, small?: boolean): MapNode => ({
  id,
  x: x / PX_PER_UNIT,
  y: y / PX_PER_UNIT,
  label,
  small,
})

/** Only the part after the city name is set, as the original does inside the Haifa box. */
const stationOnly = (node: MapNode): MapNode => ({ ...node, stationNameOnly: true })

/** A label nudge given in the original's pixels. */
const nudge = (node: MapNode, dx: number, dy: number): MapNode => ({
  ...node,
  labelOffset: { x: dx / PX_PER_UNIT, y: dy / PX_PER_UNIT },
})

export const MAP_NODES: MapNode[] = [
  // Galilee & the Krayot — the trunk runs straight down at x = 836
  px("1600", 836, 487, "left"), // Nahariya
  px("1500", 836, 672, "left"), // Akko
  px("J_KARMIEL", 836, 752),
  px("1820", 1035, 752, "above"), // Ahihud
  px("1840", 1230, 752, "right"), // Karmiel
  px("1400", 836, 860, "left"), // Kiryat Motzkin
  px("700", 836, 952, "left"), // Kiryat Hayim
  px("1300", 836, 1047, "left"), // Hutzot HaMifratz
  // Haifa bay — the bundle swings south-west around the bay
  nudge(px("1220", 790, 1191, "left"), -15, -20), // HaMifrats Central
  stationOnly(px("2100", 704, 1282, "left", true)), // Haifa Center – HaShmona
  stationOnly(px("2200", 669, 1348, "left", true)), // Bat Galim
  stationOnly(px("2300", 681, 1420, "left", true)), // Hof HaKarmel
  px("2500", 688, 1607, "right"), // Atlit
  // Jezreel valley — leaves the bay eastwards, then a 45° diagonal to Beit She'an
  px("J_VALLEY_A", 870, 1268),
  px("J_VALLEY_B", 935, 1268),
  px("1240", 1085, 1418, "left"), // Yokne'am – Kfar Yehoshu'a
  px("1250", 1215, 1550, "left"), // Migdal Ha'emek – Kfar Barukh
  px("1260", 1350, 1683, "left"), // Afula
  px("1280", 1480, 1810, "right"), // Beit She'an
  // The Carmel & Sharon coast
  px("2800", 657, 1793, "left"), // Binyamina
  px("2820", 657, 1887, "left"), // Caesarea – Pardes Hana
  px("3100", 657, 1980, "left"), // Hadera – West
  px("3300", 643, 2167, "left"), // Netanya
  px("3310", 643, 2260, "left"), // Netanya – Sapir
  px("3400", 643, 2353, "left"), // Bet Yehoshu'a
  px("3500", 645, 2540, "left"), // Herzliya
  // The Sharon loop — east along the top, down past Rosh Ha'Ayin, back west into Tel Aviv
  nudge(px("2940", 793, 2483, "above", true), -14, 0), // Ra'anana West
  nudge(px("2960", 900, 2483, "above", true), 10, 0), // Ra'anana South
  px("9200", 1023, 2483, "above", true), // Hod HaSharon – Sokolov
  px("8700", 1160, 2483, "above", true), // Kfar Sava – Nordau
  px("J_LOOP_NE", 1210, 2483),
  px("8800", 1210, 2593, "right"), // Rosh Ha'Ayin – North
  px("J_LOOP_SE", 1210, 2650),
  px("4250", 1105, 2650, "below", true), // Petah Tikva – Segula
  px("4170", 980, 2650, "above", true), // Petah Tikva – Kiryat Arye
  px("4100", 855, 2650, "below", true), // Bnei Brak
  px("J_LOOP_SW", 560, 2650),
  // The eastern line (not on the original): north from Rosh Ha'Ayin, then a 45° diagonal to Hadera East
  px("J_EAST_S", 1270, 2533),
  px("4310", 1270, 2350, "right", true), // Tira – Kokhav Ya'ir
  px("4300", 1270, 2210, "right", true), // Shomron – Tayyiba
  px("J_EAST_N", 1270, 2150),
  px("3900", 1050, 1930, "right"), // Hadera – East
  // Tel Aviv
  px("3600", 645, 2725, "left"), // University
  px("3700", 645, 2820, "left"), // Savidor Center
  px("4600", 645, 2913, "left"), // HaShalom
  px("4900", 645, 3007, "left"), // HaHagana
  // The coast south of Tel Aviv — straight down, then east around to Be'er Sheva
  px("4640", 557, 3100, "left"), // Holon Junction
  px("4660", 557, 3193, "left"), // Holon – Wolfson
  px("4680", 557, 3287, "left"), // Bat Yam – Yoseftal
  px("4690", 557, 3380, "left"), // Bat Yam – Komemiyut
  px("9800", 557, 3475, "left", true), // Rishon LeTsiyon – Moshe Dayan
  px("9000", 557, 3755, "left"), // Yavne – West
  px("5800", 572, 4033, "left"), // Ashdod – Ad Halom
  px("5900", 572, 4315, "left"), // Ashkelon
  px("9600", 572, 4595, "left"), // Sderot
  px("9650", 572, 4875, "left"), // Netivot
  px("J_NEGEV_SW", 572, 4965),
  px("9700", 745, 4965, "above"), // Ofakim
  px("J_NEGEV_SE", 884, 4965),
  // Lod & the inland lines — a 45° diagonal out of Tel Aviv, straight down through Lod
  px("J_LOD_A", 645, 3110),
  nudge(px("4800", 767, 3232, "left", true), 20, 70), // Kfar Habad
  nudge(px("5150", 867, 3332, "left", true), 8, 60), // Lod – Gane Aviv
  px("J_LOD_V", 938, 3403),
  px("5000", 938, 3567, "right"), // Lod
  px("J_RISHON", 851, 3640),
  nudge(px("9100", 722, 3694, "left", true), 35, -55), // Rishon LeTsiyon – HaRishonim
  px("J_LOD_SW", 895, 3625),
  px("5300", 778, 3767, "right", true), // Be'er Ya'akov
  px("5200", 701, 3849, "right"), // Rehovot
  px("5410", 625, 3925, "right"), // Yavne – East
  px("J_YAVNE", 590, 3962),
  px("5010", 967, 3660, "right"), // Ramla
  px("J_BSH", 996, 3710),
  px("6300", 1227, 3941, "below"), // Bet Shemesh
  px("6900", 952, 3940, "right"), // Mazkeret Batya
  px("6150", 952, 4222, "right"), // Kiryat Malakhi – Yoav
  px("7000", 952, 4500, "right"), // Kiryat Gat
  px("8550", 952, 4780, "right"), // Lehavim – Rahat
  // Ben Gurion Airport, Modi'in & Jerusalem — out of Tel Aviv at 45°, a shallow run past the airport, 45° again
  px("J_AIR_A", 741, 3060),
  px("J_AIR_B", 805, 3124),
  px("8600", 950, 3148, "above", true), // Ben Gurion Airport
  px("J_AIR_C", 990, 3150),
  px("J_MOD", 1198, 3358),
  nudge(px("300", 1252, 3299, "above", true), -40, -10), // Pa'ate Modi'in
  px("400", 1306, 3245, "right"), // Modi'in – Center
  px("680", 1443, 3598, "right"), // Jerusalem – Yitzhak Navon
  // The Negev
  px("7300", 925, 5060, "right"), // Be'er Sheva – North/University
  px("7320", 925, 5155, "below"), // Be'er Sheva – Center
  px("J_DIMONA", 1055, 5060),
  px("7500", 1345, 5350, "right"), // Dimona
]

/** Physical track adjacency (undirected). */
export const MAP_EDGES: [string, string][] = [
  // Coastal trunk
  ["1600", "1500"],
  ["1500", "J_KARMIEL"],
  ["J_KARMIEL", "1400"],
  ["1400", "700"],
  ["700", "1300"],
  ["1300", "1220"],
  ["1220", "2100"],
  ["2100", "2200"],
  ["2200", "2300"],
  ["2300", "2500"],
  ["2500", "2800"],
  ["2800", "2820"],
  ["2820", "3100"],
  ["3100", "3300"],
  ["3300", "3310"],
  ["3310", "3400"],
  ["3400", "3500"],
  ["3500", "3600"],
  ["3600", "3700"],
  ["3700", "4600"],
  ["4600", "4900"],
  // Karmiel branch
  ["J_KARMIEL", "1820"],
  ["1820", "1840"],
  // Jezreel valley
  ["1220", "J_VALLEY_A"],
  ["J_VALLEY_A", "J_VALLEY_B"],
  ["J_VALLEY_B", "1240"],
  ["1240", "1250"],
  ["1250", "1260"],
  ["1260", "1280"],
  // Sharon loop
  ["3500", "2940"],
  ["2940", "2960"],
  ["2960", "9200"],
  ["9200", "8700"],
  ["8700", "J_LOOP_NE"],
  ["J_LOOP_NE", "8800"],
  ["8800", "J_LOOP_SE"],
  ["J_LOOP_SE", "4250"],
  ["4250", "4170"],
  ["4170", "4100"],
  ["4100", "J_LOOP_SW"],
  ["J_LOOP_SW", "3600"],
  // Eastern line
  ["8800", "J_EAST_S"],
  ["J_EAST_S", "4310"],
  ["4310", "4300"],
  ["4300", "J_EAST_N"],
  ["J_EAST_N", "3900"],
  // Coast south of Tel Aviv
  ["4900", "4640"],
  ["4640", "4660"],
  ["4660", "4680"],
  ["4680", "4690"],
  ["4690", "9800"],
  ["9800", "9000"],
  ["9000", "5800"],
  ["5800", "5900"],
  ["5900", "9600"],
  ["9600", "9650"],
  ["9650", "J_NEGEV_SW"],
  ["J_NEGEV_SW", "9700"],
  ["9700", "J_NEGEV_SE"],
  ["J_NEGEV_SE", "7300"],
  ["7300", "7320"],
  ["7300", "J_DIMONA"],
  ["J_DIMONA", "7500"],
  // Lod line
  ["4900", "J_LOD_A"],
  ["J_LOD_A", "4800"],
  ["4800", "5150"],
  ["5150", "J_LOD_V"],
  ["J_LOD_V", "5000"],
  ["5000", "J_RISHON"],
  ["J_RISHON", "9100"],
  ["5000", "J_LOD_SW"],
  ["J_LOD_SW", "5300"],
  ["5300", "5200"],
  ["5200", "5410"],
  ["5410", "J_YAVNE"],
  ["J_YAVNE", "5800"],
  ["5000", "5010"],
  ["5010", "6900"],
  ["6900", "6150"],
  ["6150", "7000"],
  ["7000", "8550"],
  ["8550", "7300"],
  ["5010", "J_BSH"],
  ["J_BSH", "6300"],
  // Airport, Modi'in & Jerusalem
  ["4900", "J_AIR_A"],
  ["J_AIR_A", "J_AIR_B"],
  ["J_AIR_B", "8600"],
  ["8600", "J_AIR_C"],
  ["J_AIR_C", "J_MOD"],
  ["J_MOD", "300"],
  ["300", "400"],
  ["J_MOD", "680"],
]

/**
 * Lane order where lines share track, as on the original: where two lines run
 * side by side the one with the higher rank takes the right-hand lane facing
 * south (the western lane on the trunk). Tel Aviv reads, west to east: red 6,
 * light blue 5 (and 25 next to it), blue 2, orange 34, green 3, lime 1, pink 7.
 */
export const LINE_LANE_RANK: Record<RailLineId, number> = {
  "4": 15,
  "6": 14,
  "25": 13,
  "5": 12,
  "2": 11,
  "3X": 10,
  "3": 9,
  "1": 8,
  "7": 7,
  "8": 4,
  "10": 3,
  "9": 2,
  "12": 1,
  "11": 0,
}

/**
 * Stretches where the original swaps lanes: the Karmiel branch carries the
 * pink line north of the orange one, and the light-blue Bet Shemesh line
 * crosses to the east side of the bundle between Gane Aviv and Lod so it can
 * leave towards Ramla. Keyed by the edges' node ids (either order).
 */
export const LANE_RANK_OVERRIDES: { lineId: RailLineId; rank: number; edges: [string, string][] }[] = [
  {
    lineId: "4",
    rank: 6,
    edges: [
      ["J_KARMIEL", "1820"],
      ["1820", "1840"],
    ],
  },
  {
    lineId: "5",
    rank: 5,
    edges: [
      ["J_LOD_V", "5000"],
      ["5000", "5010"],
      ["5010", "J_BSH"],
    ],
  },
]
