/**
 * Schematic layout of the Israel Railways network for the Service Status map.
 *
 * A transcription of the current edition of Constantine Konovalov's Israeli
 * railways map (CC BY-SA 4.0 — https://ckonovalov.com/rail), the one with the
 * present line set, the numbered lines and the eastern line. Every station
 * and bend below was measured on that artwork (913 × 2576 px) and is kept in
 * its pixel coordinates (see `px`), so the drawn shapes match it 1:1.
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
const PX_PER_UNIT = 9.13

/** Width/height of the map in layout units (the original's 913 × 2576 px). */
export const MAP_BOUNDS = { width: 100, height: 282 }

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

const TRUNK_NORTH = 481

export const MAP_NODES: MapNode[] = [
  // Galilee & the Krayot — the trunk runs straight down
  px("1600", TRUNK_NORTH, 138, "left"), // Nahariya
  px("1500", TRUNK_NORTH, 197, "left"), // Akko
  px("J_KARMIEL", TRUNK_NORTH, 243),
  px("1820", 546, 243, "above"), // Ahihud
  px("1840", 608, 243, "right"), // Karmiel
  px("1400", TRUNK_NORTH, 280, "left"), // Kiryat Motzkin
  px("700", TRUNK_NORTH, 320, "left"), // Kiryat Hayim
  px("1300", TRUNK_NORTH, 360, "left"), // Hutzot HaMifratz
  // Haifa bay — the bundle swings south-west around the bay
  nudge(px("1220", 468, 426, "left"), -6, -4), // HaMifrats Central
  stationOnly(px("2100", 440, 457, "left", true)), // Haifa Center – HaShmona
  stationOnly(px("2200", 421, 488, "left", true)), // Bat Galim
  stationOnly(px("2300", 424, 521, "left", true)), // Hof HaKarmel
  px("2500", 431, 600, "right"), // Atlit
  // Jezreel valley — leaves the bay eastwards as one straight line to Beit She'an
  px("J_VALLEY", 500, 452),
  px("1240", 585, 452, "above"), // Yokne'am – Kfar Yehoshu'a
  px("1250", 674, 452, "below"), // Migdal Ha'emek – Kfar Barukh
  px("1260", 763, 452, "above"), // Afula
  px("1280", 852, 452, "below"), // Beit She'an
  // The Carmel & Sharon coast
  px("2800", 417, 679, "left"), // Binyamina
  px("2820", 417, 718, "left"), // Caesarea – Pardes Hana
  px("3100", 417, 758, "left"), // Hadera – West
  px("3300", 411, 838, "left"), // Netanya
  px("3310", 411, 878, "left"), // Netanya – Sapir
  px("3400", 411, 918, "left"), // Bet Yehoshu'a
  px("3500", 417, 1000, "left"), // Herzliya
  // The eastern line — a 45° drop from Hadera East, then straight down into Rosh Ha'Ayin
  px("3900", 656, 759, "left"), // Hadera – East
  px("J_EAST_N", 745, 848),
  px("4300", 750, 898, "right", true), // Shomron – Tayyiba
  px("4310", 750, 956, "right", true), // Tira – Kokhav Ya'ir
  px("J_EAST_S", 750, 992),
  // The Sharon loop — up from Herzliya, east along the top, down past Rosh Ha'Ayin, back west into Tel Aviv
  px("J_LOOP_W", 462, 968),
  px("2940", 507, 968, "above", true), // Ra'anana West
  px("2960", 563, 968, "above", true), // Ra'anana South
  nudge(px("9200", 628, 968, "above", true), -7, 0), // Hod HaSharon – Sokolov
  nudge(px("8700", 678, 968, "above", true), 7, 0), // Kfar Sava – Nordau
  px("J_LOOP_NE", 736, 968),
  px("8800", 736, 1017, "right"), // Rosh Ha'Ayin – North
  px("J_LOOP_SE", 736, 1048),
  px("4250", 676, 1048, "below", true), // Petah Tikva – Segula
  px("4170", 600, 1048, "below", true), // Petah Tikva – Kiryat Arye
  px("4100", 522, 1048, "below", true), // Bnei Brak
  px("J_LOOP_SW", 372, 1048),
  // Tel Aviv
  px("3600", 411, 1077, "left"), // University
  px("3700", 411, 1145, "left"), // Savidor Center
  px("4600", 411, 1212, "left"), // HaShalom
  px("4900", 411, 1281, "left"), // HaHagana
  // The coast south of Tel Aviv — straight down, then east around to Be'er Sheva
  px("4640", 372, 1348, "left"), // Holon Junction
  px("4660", 372, 1416, "left"), // Holon – Wolfson
  px("4680", 372, 1484, "left"), // Bat Yam – Yoseftal
  px("4690", 372, 1552, "left"), // Bat Yam – Komemiyut
  px("9800", 372, 1620, "left", true), // Rishon LeTsiyon – Moshe Dayan
  px("9000", 372, 1686, "left"), // Yavne – West
  px("5800", 379, 1775, "left"), // Ashdod – Ad Halom
  px("5900", 379, 1855, "left"), // Ashkelon
  px("9600", 372, 1933, "left"), // Sderot
  px("9650", 372, 2012, "left"), // Netivot
  px("J_NEGEV_SW", 372, 2072),
  px("9700", 462, 2072, "above"), // Ofakim
  px("J_NEGEV_SE", 554, 2072),
  // Lod & the inland lines — a 45° diagonal out of Tel Aviv, straight down through Lod
  px("J_LOD_A", 404, 1330),
  nudge(px("4800", 480, 1402, "left", true), 4, -8), // Kfar Habad
  px("5150", 525, 1449, "left", true), // Lod – Gane Aviv
  px("J_LOD_V", 567, 1491),
  px("5000", 567, 1567, "right"), // Lod
  px("J_RISHON", 505, 1615),
  nudge(px("9100", 455, 1640, "above", true), -8, 0), // Rishon LeTsiyon – HaRishonim
  px("J_LOD_SW", 547, 1592),
  nudge(px("5300", 497, 1641, "right", true), 0, 10), // Be'er Ya'akov
  nudge(px("5200", 456, 1693, "right"), 0, 8), // Rehovot
  nudge(px("5410", 419, 1730, "right"), 0, 12), // Yavne – East
  px("J_YAVNE", 389, 1760),
  px("5010", 579, 1604, "right"), // Ramla
  px("J_BSH", 592, 1624),
  px("6300", 664, 1696, "right"), // Bet Shemesh
  px("6900", 573, 1709, "right", true), // Mazkeret Batya
  px("6150", 573, 1810, "right"), // Kiryat Malakhi – Yoav
  px("7000", 573, 1919, "right"), // Kiryat Gat
  px("8550", 573, 2024, "right"), // Lehavim – Rahat
  // Ben Gurion Airport, Modi'in & Jerusalem — out of Tel Aviv at 45°, level past the airport, then a "V"
  px("J_AIR_A", 443, 1300),
  px("J_AIR_B", 518, 1375),
  px("8600", 562, 1375, "above"), // Ben Gurion Airport
  px("J_MOD", 630, 1375),
  nudge(px("300", 668, 1337, "right", true), 0, 12), // Pa'ate Modi'in
  px("400", 702, 1303, "right"), // Modi'in – Center
  px("680", 795, 1540, "right"), // Jerusalem – Yitzhak Navon
  // The Negev
  px("7300", 567, 2129, "left"), // Be'er Sheva – North/University
  px("7320", 567, 2165, "below"), // Be'er Sheva – Center
  px("J_DIMONA", 620, 2129),
  px("7500", 726, 2237, "below"), // Dimona
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
  ["1220", "J_VALLEY"],
  ["J_VALLEY", "1240"],
  ["1240", "1250"],
  ["1250", "1260"],
  ["1260", "1280"],
  // Sharon loop
  ["3500", "J_LOOP_W"],
  ["J_LOOP_W", "2940"],
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
  ["8600", "J_MOD"],
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
