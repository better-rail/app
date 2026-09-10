/**
 * Turns the traced geometry in data/rail-map-layout.ts into what the renderer
 * draws: one polyline per line, a dot (or a pass-through tick) on every lane
 * that reaches a station, the name of every station, the city frames, the
 * terminal badges and the airport glyph.
 *
 * Pure TypeScript with no Skia or React imports: the renderer draws whatever
 * comes out of here, and the same model can be rendered to SVG in a script to
 * check it against the original artwork. Everything is in map units (the
 * original's pixels ÷ 9.13). The lines are drawn exactly as traced, so nothing
 * here decides where a line goes; the model only indexes the geometry for hit
 * tests and for cutting out the stretch of a line between two of its stations.
 */
import { type RailLine, type RailLineId, RAIL_LINES } from "@/data/rail-lines"
import {
  AIRPORT_ICON,
  CITY_BOXES,
  type CityBox,
  IRREGULAR_STRETCHES,
  LINE_GEOMETRY,
  type LabelSide,
  MAP_BOUNDS,
  STATION_LABELS,
  TERMINAL_BADGES,
  type TracedStation,
  WATER,
} from "@/data/rail-map-layout"

export type Point = { x: number; y: number }

// Proportions measured on the original artwork (913 px = 100 units).
/** Stroke width of a line (10.5 px). */
export const LINE_STROKE = 1.15
/**
 * Every line is drawn on a ground-coloured casing as wide as the lane pitch
 * (13 px), which keeps the thin gap between parallel lanes and outlines a
 * line where it crosses over another, as the original does.
 */
export const LINE_CASING = 1.42
/**
 * Bottom-to-top drawing order: at every crossing the original shows which
 * line runs over which (the loop's red over the Tel Aviv lanes, the light
 * blue over the Lod lanes, the Karmiel pair over the Nahariya pair…).
 */
export const LINE_DRAW_ORDER: RailLineId[] = ["3", "7", "1", "2", "3X", "5", "25", "4", "9", "10", "11", "8", "12", "6"]
/** Radius of the bends: every corner of the traced polylines is rounded to this (12 px) or less. */
export const CORNER_RADIUS = 1.3
/** Station dot radius (5.5 px). */
export const MARKER_RADIUS = 0.6
/** The ground-coloured ring inside a terminal's dot (the dot is as wide as the lane, so the ring sits within it). */
export const TERMINAL_RING_RADIUS = 0.4
export const TERMINAL_RING_WIDTH = 0.14
/** Stroke of the hollow circle marking a stop trains may pass. */
export const IRREGULAR_STOP_STROKE = 0.22
/** The stripe along a stretch served at irregular intervals. */
export const IRREGULAR_STRIPE_WIDTH = 0.3
/** Station names: one size for every station (16 px). */
export const LABEL_FONT_SIZE = 1.75
/** Latin and Cyrillic capitals stand taller than Hebrew and Arabic letters: shrink them to the same visual weight. */
export const LATIN_SCALE = 0.8
export const isRtlScript = (text: string): boolean => /[\u0590-\u06FF]/.test(text)
/** The size a name is set at, scaled down for Latin/Cyrillic script. */
export const nameFontSize = (text: string): number => LABEL_FONT_SIZE * (isRtlScript(text) ? 1 : LATIN_SCALE)
export const LABEL_LINE_HEIGHT = 1.02
/** City names inside the frames (26 px). */
export const CITY_FONT_SIZE = 2.85
/** Terminal badges (19 × 11 px boxes). */
export const BADGE_SIZE = { width: 2.1, height: 1.2, radius: 0.3, fontSize: 0.95 }
/** Corner radius and stroke of the city frames (10 px and 2 px). */
export const CITY_BOX_RADIUS = 1.1
export const CITY_BOX_STROKE = 0.22
/** The shoreline ribbon (9 px), softened at the edges like the original's. */
export const SHORE_WIDTH = 1.0
export const SHORE_BLUR = 0.35

export type LinePath = {
  lineId: RailLineId
  line: RailLine
  /** The traced polyline. */
  vertices: Point[]
  /** SVG path data for `vertices`. */
  d: string
  /** Index into `vertices` of every calling point, by station id. */
  stationIndex: Map<string, number>
  stations: TracedStation[]
}

export type MarkerKind =
  /** A calling point: a dot. */
  | "stop"
  /** The line runs through and trains may pass without stopping: a hollow circle (the original's legend). */
  | "irregular"
  /** The line ends here: a dot with a ring. */
  | "terminal"

export type StationMarker = {
  stationId: string
  lineId: RailLineId
  point: Point
  kind: MarkerKind
}

export type StationLabel = {
  stationId: string
  side: LabelSide
  anchor: Point
  maxWidth: number
  stationNameOnly: boolean
}

export type TerminalBadge = { lineId: RailLineId; line: RailLine; center: Point }

/** A stretch served at irregular intervals, drawn with a stripe along the line. */
export type IrregularStretch = { lineId: RailLineId; d: string }

/** The original's water: the sea as a filled polygon, its shoreline as a ribbon, and the lakes. */
export type MapWater = {
  sea: string
  shore: string
  lakes: string[]
  /** Horizontal extent of the sea, for its gradient (deeper blue away from the coast). */
  seaLeft: number
  seaRight: number
}

export type RailMapModel = {
  bounds: { width: number; height: number }
  lines: LinePath[]
  markers: StationMarker[]
  labels: StationLabel[]
  cities: CityBox[]
  badges: TerminalBadge[]
  irregular: IrregularStretch[]
  water: MapWater
  airport: { x: number; y: number; height: number }
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString()

/** SVG path data through `points` with straight segments. */
export const polylineD = (points: Point[]): string =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ")

/**
 * SVG path data through `points` with every bend rounded: each interior
 * vertex becomes a quadratic curve whose radius is CORNER_RADIUS, or less
 * where the neighbouring segments are short (so the traced curves stay
 * smooth) or where the vertex is a station (`fixed`), which must stay on the
 * line for its dot.
 */
export const smoothPathD = (points: Point[], fixed?: Set<number>): string => {
  if (points.length < 3) return polylineD(points)
  let d = `M${fmt(points[0].x)} ${fmt(points[0].y)}`
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1]
    const v = points[i]
    const b = points[i + 1]
    const d1 = Math.hypot(v.x - a.x, v.y - a.y)
    const d2 = Math.hypot(b.x - v.x, b.y - v.y)
    if (d1 === 0 || d2 === 0) continue
    const cos = ((v.x - a.x) * (b.x - v.x) + (v.y - a.y) * (b.y - v.y)) / (d1 * d2)
    if (cos > 0.9994) {
      // Straight on (under 2°): no bend to round.
      d += ` L${fmt(v.x)} ${fmt(v.y)}`
      continue
    }
    const r = Math.min(CORNER_RADIUS, d1 / 2, d2 / 2, fixed?.has(i) ? 0.5 : Number.POSITIVE_INFINITY)
    const s = { x: v.x + ((a.x - v.x) / d1) * r, y: v.y + ((a.y - v.y) / d1) * r }
    const e = { x: v.x + ((b.x - v.x) / d2) * r, y: v.y + ((b.y - v.y) / d2) * r }
    d += ` L${fmt(s.x)} ${fmt(s.y)} Q${fmt(v.x)} ${fmt(v.y)} ${fmt(e.x)} ${fmt(e.y)}`
  }
  const last = points[points.length - 1]
  return `${d} L${fmt(last.x)} ${fmt(last.y)}`
}

const toPoints = (flat: number[]): Point[] => {
  const points: Point[] = []
  for (let i = 0; i + 1 < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] })
  return points
}

export const buildRailMapModel = (): RailMapModel => {
  const lines: LinePath[] = RAIL_LINES.map((line) => {
    const geometry = LINE_GEOMETRY[line.id]
    const vertices = toPoints(geometry.points)
    return {
      lineId: line.id,
      line,
      vertices,
      d: smoothPathD(vertices, new Set(geometry.stations.map((s) => s.index))),
      stationIndex: new Map(geometry.stations.map((s) => [s.id, s.index])),
      stations: geometry.stations,
    }
  })

  const markers: StationMarker[] = []
  for (const line of lines) {
    line.stations.forEach((station, i) => {
      const terminal = i === 0 || i === line.stations.length - 1
      markers.push({
        stationId: station.id,
        lineId: line.lineId,
        point: line.vertices[station.index],
        kind: terminal ? "terminal" : station.stop ? "stop" : "irregular",
      })
    })
  }

  const labels: StationLabel[] = Object.entries(STATION_LABELS).map(([stationId, spec]) => ({
    stationId,
    side: spec.side,
    anchor: { x: spec.x, y: spec.y },
    maxWidth: spec.maxWidth,
    stationNameOnly: spec.stationNameOnly ?? false,
  }))

  const sea = toPoints(WATER.sea)
  const water: MapWater = {
    sea: `${polylineD(sea)} Z`,
    shore: polylineD(toPoints(WATER.shore)),
    lakes: WATER.lakes.map((lake) => `${polylineD(toPoints(lake))} Z`),
    seaLeft: Math.min(...sea.map((p) => p.x)),
    seaRight: Math.max(...sea.map((p) => p.x)),
  }

  const byId = new Map(RAIL_LINES.map((l) => [l.id, l]))
  const badges: TerminalBadge[] = TERMINAL_BADGES.map((b) => ({
    lineId: b.lineId,
    line: byId.get(b.lineId) as RailLine,
    center: { x: b.x, y: b.y },
  }))

  const irregular: IrregularStretch[] = IRREGULAR_STRETCHES.flatMap((s) => {
    const line = lines.find((l) => l.lineId === s.lineId)
    const d = line && linePathBetween(line, s.fromStationId, s.toStationId)
    return d ? [{ lineId: s.lineId, d }] : []
  })

  return { bounds: MAP_BOUNDS, lines, markers, labels, cities: CITY_BOXES, badges, irregular, water, airport: AIRPORT_ICON }
}

/**
 * SVG path data for the stretch of `line` between two of its stations, in
 * either order. The bends are rounded the same way as the whole line, so the
 * stretch lies exactly on it.
 */
export const linePathBetween = (line: LinePath, fromStationId: string, toStationId: string): string | undefined => {
  const a = line.stationIndex.get(fromStationId)
  const b = line.stationIndex.get(toStationId)
  if (a === undefined || b === undefined) return undefined
  const start = Math.min(a, b)
  const fixed = new Set<number>()
  for (const index of line.stationIndex.values()) if (index >= start) fixed.add(index - start)
  return smoothPathD(line.vertices.slice(start, Math.max(a, b) + 1), fixed)
}

/** Where the given stations sit on `line` (stations not on the line are skipped). */
export const lineStationPoints = (line: LinePath, stationIds: string[]): Point[] =>
  stationIds.flatMap((id) => {
    const index = line.stationIndex.get(id)
    return index === undefined ? [] : [line.vertices[index]]
  })

const segmentDistance = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** The line closest to `p` within `tolerance` map units, for tap selection. */
export const nearestLine = (model: RailMapModel, p: Point, tolerance: number): LinePath | undefined => {
  let best: { line: LinePath; distance: number } | undefined
  for (const line of model.lines) {
    for (let i = 0; i + 1 < line.vertices.length; i++) {
      const distance = segmentDistance(p, line.vertices[i], line.vertices[i + 1])
      if (distance <= tolerance && (!best || distance < best.distance)) best = { line, distance }
    }
  }
  return best?.line
}

/**
 * The name shown on the map: parentheticals go, and inside a city frame so
 * does the city prefix ("Tel Aviv - HaShalom" → "HaShalom").
 */
export const mapStationName = (name: string, stationNameOnly: boolean): string => {
  let text = name.replace(/\s*\([^)]*\)/g, "").trim()
  if (stationNameOnly) {
    const parts = text.split(/\s+[-–]\s+/)
    if (parts.length > 1) text = parts.slice(1).join(" - ")
  }
  return text
}
