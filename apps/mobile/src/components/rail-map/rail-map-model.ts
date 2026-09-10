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
  LINE_GEOMETRY,
  type LabelSide,
  MAP_BOUNDS,
  STATION_LABELS,
  TERMINAL_BADGES,
  type TracedStation,
} from "@/data/rail-map-layout"

export type Point = { x: number; y: number }

// Proportions measured on the original artwork (913 px = 100 units).
/** Stroke width of a line (10.5 px). */
export const LINE_STROKE = 1.15
/** Station dot radius (5.5 px). */
export const MARKER_RADIUS = 0.6
/** The short tick across a lane where a line passes a station without calling. */
export const PASS_TICK_LENGTH = 1.0
export const PASS_TICK_WIDTH = 0.22
/** Font sizes: the original's 21 px and 14 px names, with 9 px for the second language. */
export const LABEL_FONT_SIZE = { big: 2.3, small: 1.55, secondary: 0.99 }
/** Latin and Cyrillic capitals stand taller than Hebrew and Arabic letters: shrink them to the same visual weight. */
export const LATIN_SCALE = 0.8
export const isRtlScript = (text: string): boolean => /[\u0590-\u06FF]/.test(text)
/** The size a name is set at: the label's size, scaled down for Latin/Cyrillic script. */
export const nameFontSize = (size: "big" | "small", text: string): number =>
  LABEL_FONT_SIZE[size] * (isRtlScript(text) ? 1 : LATIN_SCALE)
export const LABEL_LINE_HEIGHT = 1.02
/** City names inside the frames (26 px and 19 px). */
export const CITY_FONT_SIZE = { primary: 2.85, secondary: 2.05 }
/** Terminal badges (19 × 11 px boxes). */
export const BADGE_SIZE = { width: 2.1, height: 1.2, radius: 0.3, fontSize: 0.95 }
/** Corner radius and stroke of the city frames (10 px and 2 px). */
export const CITY_BOX_RADIUS = 1.1
export const CITY_BOX_STROKE = 0.22

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

export type StationMarker = {
  stationId: string
  lineId: RailLineId
  point: Point
  /** `stop` is a dot; `pass` is a tick across the lane (the line runs through). */
  kind: "stop" | "pass"
  /** Direction of the lane at the marker, radians. */
  angle: number
}

export type StationLabel = {
  stationId: string
  side: LabelSide
  anchor: Point
  maxWidth: number
  size: "big" | "small"
  stationNameOnly: boolean
  /** The second language goes under the name instead of over it. */
  secondaryBelow: boolean
}

export type TerminalBadge = { lineId: RailLineId; line: RailLine; center: Point }

export type RailMapModel = {
  bounds: { width: number; height: number }
  lines: LinePath[]
  markers: StationMarker[]
  labels: StationLabel[]
  cities: CityBox[]
  badges: TerminalBadge[]
  airport: { x: number; y: number; height: number }
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString()

/** SVG path data through `points` with straight segments. */
export const polylineD = (points: Point[]): string =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ")

const toPoints = (flat: number[]): Point[] => {
  const points: Point[] = []
  for (let i = 0; i + 1 < flat.length; i += 2) points.push({ x: flat[i], y: flat[i + 1] })
  return points
}

/** Direction of the polyline at vertex `index`, averaged over its neighbours. */
const directionAt = (vertices: Point[], index: number): number => {
  const prev = vertices[Math.max(0, index - 1)]
  const next = vertices[Math.min(vertices.length - 1, index + 1)]
  return Math.atan2(next.y - prev.y, next.x - prev.x)
}

export const buildRailMapModel = (): RailMapModel => {
  const lines: LinePath[] = RAIL_LINES.map((line) => {
    const geometry = LINE_GEOMETRY[line.id]
    const vertices = toPoints(geometry.points)
    return {
      lineId: line.id,
      line,
      vertices,
      d: polylineD(vertices),
      stationIndex: new Map(geometry.stations.map((s) => [s.id, s.index])),
      stations: geometry.stations,
    }
  })

  const markers: StationMarker[] = []
  for (const line of lines) {
    for (const station of line.stations) {
      markers.push({
        stationId: station.id,
        lineId: line.lineId,
        point: line.vertices[station.index],
        kind: station.stop ? "stop" : "pass",
        angle: directionAt(line.vertices, station.index),
      })
    }
  }

  const labels: StationLabel[] = Object.entries(STATION_LABELS).map(([stationId, spec]) => ({
    stationId,
    side: spec.side,
    anchor: { x: spec.x, y: spec.y },
    maxWidth: spec.maxWidth,
    size: spec.size,
    stationNameOnly: spec.stationNameOnly ?? false,
    secondaryBelow: spec.secondaryBelow ?? false,
  }))

  const byId = new Map(RAIL_LINES.map((l) => [l.id, l]))
  const badges: TerminalBadge[] = TERMINAL_BADGES.map((b) => ({
    lineId: b.lineId,
    line: byId.get(b.lineId) as RailLine,
    center: { x: b.x, y: b.y },
  }))

  return { bounds: MAP_BOUNDS, lines, markers, labels, cities: CITY_BOXES, badges, airport: AIRPORT_ICON }
}

/** SVG path data for the stretch of `line` between two of its stations, in either order. */
export const linePathBetween = (line: LinePath, fromStationId: string, toStationId: string): string | undefined => {
  const a = line.stationIndex.get(fromStationId)
  const b = line.stationIndex.get(toStationId)
  if (a === undefined || b === undefined) return undefined
  return polylineD(line.vertices.slice(Math.min(a, b), Math.max(a, b) + 1))
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
