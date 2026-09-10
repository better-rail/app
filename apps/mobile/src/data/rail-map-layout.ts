/**
 * Schematic layout of the Israel Railways network for the Service Status map.
 *
 * Modelled on Constantine Konovalov's Israeli railways map: north at the top,
 * the coastal trunk running straight down the page, branches leaving it at
 * 45° or 90°, and every line drawn as its own parallel lane where lines share
 * track. Coordinates are abstract map units (see MAP_BOUNDS); the renderer
 * scales them to the canvas.
 *
 * Nodes are the app's "3700"-style station ids, plus a few `J_*` junction
 * waypoints that only exist so a branch leaves the trunk between two stations.
 * Edges are physical track adjacency; a line's drawn path is the shortest
 * route through this graph between its consecutive calling points, so trains
 * that skip stations still follow the track (see rail-map-model.ts).
 */
import type { RailLineId } from "./rail-lines"

export type LabelSide = "left" | "right" | "above" | "below"

export type MapNode = {
  id: string
  x: number
  y: number
  /** Where the station name goes relative to the marker; omitted for junction waypoints. */
  label?: LabelSide
}

/** Width/height of the map in layout units. Right-side labels may overhang the width slightly. */
export const MAP_BOUNDS = { width: 100, height: 286 }

const TRUNK_X = 44

const node = (id: string, x: number, y: number, label?: LabelSide): MapNode => ({ id, x, y, label })

export const MAP_NODES: MapNode[] = [
  // Galilee & the Krayot
  node("1600", TRUNK_X, 6, "left"), // Nahariya
  node("1500", TRUNK_X, 13, "left"), // Akko
  node("J_KARMIEL", TRUNK_X, 17.5),
  node("1820", 57, 11, "above"), // Ahihud
  node("1840", 70, 7, "right"), // Karmiel
  node("1400", TRUNK_X, 22, "left"), // Kiryat Motzkin
  node("700", TRUNK_X, 28, "left"), // Kiryat Hayim
  node("1300", TRUNK_X, 34, "left"), // Hutzot HaMifratz
  node("1220", TRUNK_X, 41, "left"), // HaMifrats Central
  // Jezreel valley
  node("1240", 58, 50, "right"), // Yokne'am – Kfar Yehoshu'a
  node("1250", 68, 57, "right"), // Migdal Ha'emek – Kfar Barukh
  node("1260", 77, 64, "right"), // Afula
  node("1280", 88, 70, "right"), // Beit She'an
  // Haifa & the Carmel coast
  node("2100", TRUNK_X, 48, "left"), // Haifa Center – HaShmona
  node("2200", TRUNK_X, 55, "left"), // Bat Galim
  node("2300", TRUNK_X, 62, "left"), // Hof HaKarmel
  node("2500", TRUNK_X, 71, "left"), // Atlit
  node("2800", TRUNK_X, 82, "left"), // Binyamina
  node("2820", TRUNK_X, 88, "left"), // Caesarea – Pardes Hana
  node("3100", TRUNK_X, 95, "left"), // Hadera – West
  // The eastern line (labels on its inner side, the outer side being the map edge)
  node("3900", 84, 92, "left"), // Hadera – East
  node("4300", 92, 102, "left"), // Shomron – Tayyiba
  node("4310", 94, 113, "left"), // Tira – Kokhav Ya'ir
  // Sharon coast
  node("3300", TRUNK_X, 105, "left"), // Netanya
  node("3310", TRUNK_X, 111, "left"), // Netanya – Sapir
  node("3400", TRUNK_X, 118, "left"), // Bet Yehoshu'a
  node("3500", TRUNK_X, 129, "left"), // Herzliya
  // The Sharon loop
  node("2940", 59, 127, "below"), // Ra'anana West
  node("2960", 65, 127, "above"), // Ra'anana South
  node("9200", 77, 127, "below"), // Hod HaSharon – Sokolov
  node("8700", 88, 127, "above"), // Kfar Sava – Nordau
  node("8800", 96, 136, "below"), // Rosh Ha'Ayin – North
  node("4250", 80, 145, "below"), // Petah Tikva – Segula
  node("4170", 70, 145, "above"), // Petah Tikva – Kiryat Arye
  node("4100", 60, 145, "below"), // Bnei Brak
  // Tel Aviv
  node("3600", TRUNK_X, 137, "left"), // University
  node("3700", TRUNK_X, 144, "left"), // Savidor Center
  node("4600", TRUNK_X, 151, "left"), // HaShalom
  node("4900", TRUNK_X, 158, "left"), // HaHagana
  // The coast south of Tel Aviv
  node("4640", 28, 169, "left"), // Holon Junction
  node("4660", 24, 176, "left"), // Holon – Wolfson
  node("4680", 20, 183, "left"), // Bat Yam – Yoseftal
  node("4690", 16, 190, "left"), // Bat Yam – Komemiyut
  node("9800", 13, 197, "left"), // Rishon LeTsiyon – Moshe Dayan
  node("9000", 13, 208, "left"), // Yavne – West
  node("5800", 13, 220, "left"), // Ashdod – Ad Halom
  node("5900", 13, 234, "left"), // Ashkelon
  node("9600", 19, 244, "left"), // Sderot
  node("9650", 27, 251, "left"), // Netivot
  node("9700", 36, 258, "left"), // Ofakim
  // Lod & the inland lines
  node("4800", 52, 167, "left"), // Kfar Habad
  node("5150", 54, 174, "left"), // Lod – Gane Aviv
  node("5000", 56, 181, "left"), // Lod
  node("J_RISHON", 53, 187),
  node("9100", 36, 189, "below"), // Rishon LeTsiyon – HaRishonim
  node("5300", 50, 195, "right"), // Be'er Ya'akov
  node("5200", 46, 203, "left"), // Rehovot
  node("5410", 29, 211, "right"), // Yavne – East
  node("5010", 68, 186, "right"), // Ramla
  node("6900", 68, 202, "left"), // Mazkeret Batya
  node("6150", 68, 216, "left"), // Kiryat Malakhi – Yoav
  node("7000", 68, 228, "right"), // Kiryat Gat
  node("8550", 62, 253, "right"), // Lehavim – Rahat
  node("J_BSH", 76, 195),
  node("6300", 80, 218, "right"), // Bet Shemesh
  // Ben Gurion Airport, Modi'in & Jerusalem
  node("J_AIR", 55, 161),
  node("8600", 63, 168, "right"), // Ben Gurion Airport
  node("J_MOD", 74, 178),
  node("300", 84, 180, "above"), // Pa'ate Modi'in
  node("400", 92, 184, "right"), // Modi'in – Center
  node("680", 94, 203, "below"), // Jerusalem – Yitzhak Navon
  // The Negev
  node("7300", 48, 267, "left"), // Be'er Sheva – North/University
  node("7320", 48, 275, "left"), // Be'er Sheva – Center
  node("7500", 70, 279, "right"), // Dimona
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
  ["1220", "1240"],
  ["1240", "1250"],
  ["1250", "1260"],
  ["1260", "1280"],
  // Sharon loop
  ["3500", "2940"],
  ["2940", "2960"],
  ["2960", "9200"],
  ["9200", "8700"],
  ["8700", "8800"],
  ["8800", "4250"],
  ["4250", "4170"],
  ["4170", "4100"],
  ["4100", "3600"],
  // Eastern line
  ["8800", "4310"],
  ["4310", "4300"],
  ["4300", "3900"],
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
  ["9650", "9700"],
  ["9700", "7300"],
  ["7300", "7320"],
  ["7300", "7500"],
  // Lod line
  ["4900", "4800"],
  ["4800", "5150"],
  ["5150", "5000"],
  ["5000", "J_RISHON"],
  ["J_RISHON", "9100"],
  ["J_RISHON", "5300"],
  ["5300", "5200"],
  ["5200", "5410"],
  ["5410", "5800"],
  ["5000", "5010"],
  ["5010", "6900"],
  ["6900", "6150"],
  ["6150", "7000"],
  ["7000", "8550"],
  ["8550", "7300"],
  ["5010", "J_BSH"],
  ["J_BSH", "6300"],
  // Airport, Modi'in & Jerusalem
  ["4900", "J_AIR"],
  ["J_AIR", "8600"],
  ["8600", "J_MOD"],
  ["J_MOD", "300"],
  ["300", "400"],
  ["J_MOD", "680"],
]

/**
 * Lane order where lines share track. Where two lines run side by side the one
 * with the higher rank takes the right-hand lane (facing south), so the order
 * stays consistent along the trunk and lines cross as rarely as possible.
 */
export const LINE_LANE_RANK: Record<RailLineId, number> = {
  "6": 13,
  "2": 12,
  "25": 11,
  "1": 10,
  "3": 9,
  "3X": 8,
  "5": 7,
  "7": 6,
  "4": 5,
  "11": 4,
  "12": 3,
  "9": 2,
  "10": 1,
  "8": 0,
}
