/**
 * Geometry for the schematic rail map, computed once from the layout data.
 *
 * Pure TypeScript with no Skia or React imports: the renderer draws whatever
 * comes out of here, and the same model can be rendered to SVG in a script to
 * check the layout. Everything is in layout units (see MAP_BOUNDS).
 *
 * Lines that share track are drawn as parallel lanes: every physical edge
 * knows which lines use it and each line gets a fixed offset from the track's
 * centre line on that edge. Where the same lanes turn a corner together the
 * lane vertices are the mitred intersections of the offset segments; where a
 * branch leaves a bundle its lines start from the lanes they hold in that
 * bundle, so they peel off the way the original artwork draws them.
 */
import { RAIL_LINES, type RailLine, type RailLineId } from "@/data/rail-lines"
import {
  LANE_RANK_OVERRIDES,
  LINE_LANE_RANK,
  MAP_BOUNDS,
  MAP_EDGES,
  MAP_NODES,
  type LabelSide,
  type MapNode,
} from "@/data/rail-map-layout"

export type Point = { x: number; y: number }

// Proportions measured on the original artwork (913 px = 100 units).
/** Gap between the centres of two neighbouring lanes (13 px). */
export const LANE_WIDTH = 1.42
/** Stroke width of a line (9 px). */
export const LINE_STROKE = 0.99
/** Corner radius where a line bends. */
export const CORNER_RADIUS = 3.5
/** Radius of a station dot (5.5 px). */
export const MARKER_RADIUS = 0.6
/** Half-height of the clearance kept around an interchange's row of dots. */
export const CAPSULE_RADIUS = 0.9
/** Label typography, in layout units. */
export const LABEL_FONT_SIZE = 2.1
export const LABEL_LINE_HEIGHT = 1.1
export const LABEL_MAX_WIDTH = 19
/** Single-line names longer than this are broken in two. */
export const LABEL_BREAK_LENGTH = 14
/** Type size of the labels in the tight spots, relative to LABEL_FONT_SIZE, and their shorter line length. */
export const SMALL_LABEL_SCALE = 0.65
export const SMALL_LABEL_BREAK_LENGTH = 9

export type LinePath = {
  lineId: RailLineId
  line: RailLine
  /** Every node the line passes, in order, junction waypoints included. */
  nodeIds: string[]
  /** The lane-offset polyline, one vertex per node. */
  vertices: Point[]
  /** The rounded polyline as an SVG path string. */
  d: string
  /** Vertex index of every node on the path. */
  vertexIndex: Map<string, number>
}

export type StationMarker = {
  stationId: string
  center: Point
  /** Points on the lanes of the lines calling at the station. */
  lanePoints: Point[]
  lineIds: RailLineId[]
  /** A dot for one line; a row of dots across the lanes for an interchange. */
  kind: "single" | "capsule"
  /** End points of the row (equal to the dot for a single marker). */
  a: Point
  b: Point
  radius: number
  /** How far the drawn marker reaches from the node centre — labels start beyond it. */
  halfWidth: number
}

export type StationLabel = {
  stationId: string
  side: LabelSide
  /** The point the text is anchored at (right edge for "left" labels, left edge for "right", centre for above/below). */
  anchor: Point
  maxWidth: number
  /** 1 for regular labels, less in the tight spots (see MapNode.small). */
  fontScale: number
  /** Drop the city part of the name (see MapNode.stationNameOnly). */
  stationNameOnly: boolean
}

export type RailMapModel = {
  bounds: { width: number; height: number }
  lines: LinePath[]
  markers: StationMarker[]
  labels: StationLabel[]
  nodeById: Map<string, MapNode>
}

// --- graph helpers ------------------------------------------------------------------

const nodeById = new Map<string, MapNode>(MAP_NODES.map((n) => [n.id, n]))

const adjacency = new Map<string, string[]>()
for (const [a, b] of MAP_EDGES) {
  adjacency.set(a, [...(adjacency.get(a) ?? []), b])
  adjacency.set(b, [...(adjacency.get(b) ?? []), a])
}

/** Fewest-hops route through the track graph (undefined when the nodes are not connected). */
const shortestPath = (from: string, to: string): string[] | undefined => {
  if (from === to) return [from]
  const previous = new Map<string, string>([[from, from]])
  const queue = [from]
  while (queue.length > 0) {
    const current = queue.shift() as string
    for (const next of adjacency.get(current) ?? []) {
      if (previous.has(next)) continue
      previous.set(next, current)
      if (next === to) {
        const path = [to]
        let at = to
        while (at !== from) {
          at = previous.get(at) as string
          path.push(at)
        }
        return path.reverse()
      }
      queue.push(next)
    }
  }
  return undefined
}

const point = (id: string): Point => {
  const n = nodeById.get(id)
  if (!n) throw new Error(`Unknown map node ${id}`)
  return { x: n.x, y: n.y }
}

/** Edges are keyed north-to-south (then west-to-east) so lane offsets are the same whichever way a line travels. */
const canonical = (a: string, b: string): [string, string] => {
  const pa = point(a)
  const pb = point(b)
  return pa.y < pb.y || (pa.y === pb.y && pa.x <= pb.x) ? [a, b] : [b, a]
}

const edgeKey = (a: string, b: string): string => canonical(a, b).join("|")

/** Unit direction of the canonical edge and its right-hand normal (facing along it). */
const edgeFrame = (a: string, b: string): { dir: Point; normal: Point } => {
  const [from, to] = canonical(a, b)
  const p = point(from)
  const q = point(to)
  const len = Math.hypot(q.x - p.x, q.y - p.y) || 1
  const dir = { x: (q.x - p.x) / len, y: (q.y - p.y) / len }
  return { dir, normal: { x: -dir.y, y: dir.x } }
}

const rankOverrides = new Map<string, number>()
for (const override of LANE_RANK_OVERRIDES) {
  for (const [a, b] of override.edges) rankOverrides.set(`${override.lineId}@${edgeKey(a, b)}`, override.rank)
}

const laneRank = (lineId: RailLineId, key: string): number => rankOverrides.get(`${lineId}@${key}`) ?? LINE_LANE_RANK[lineId]

// --- vector helpers ------------------------------------------------------------------

const add = (p: Point, q: Point, k = 1): Point => ({ x: p.x + q.x * k, y: p.y + q.y * k })
const sub = (p: Point, q: Point): Point => ({ x: p.x - q.x, y: p.y - q.y })
const len = (p: Point): number => Math.hypot(p.x, p.y)
const unit = (p: Point): Point => {
  const l = len(p) || 1
  return { x: p.x / l, y: p.y / l }
}
const mid = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })

/** Intersection of the infinite lines through (a, b) and (c, d); undefined when parallel. */
const intersect = (a: Point, b: Point, c: Point, d: Point): Point | undefined => {
  const r = sub(b, a)
  const s = sub(d, c)
  const cross = r.x * s.y - r.y * s.x
  if (Math.abs(cross) < 1e-6) return undefined
  const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / cross
  return add(a, r, t)
}

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString()

const isStraightThrough = (inDir: Point, outDir: Point): boolean =>
  Math.abs(inDir.x * outDir.y - inDir.y * outDir.x) < 1e-3 && inDir.x * outDir.x + inDir.y * outDir.y > 0

/**
 * A polyline with every interior corner rounded, as an SVG path. A corner may
 * use most of a segment that has no corner at its other end, so short legs
 * between two corners share the leg and long legs get the full radius.
 */
export const roundedPathD = (vertices: Point[], radius = CORNER_RADIUS): string => {
  if (vertices.length === 0) return ""
  if (vertices.length === 1) return `M${fmt(vertices[0].x)} ${fmt(vertices[0].y)}`

  const corner = vertices.map((v, i) => {
    if (i === 0 || i === vertices.length - 1) return false
    return !isStraightThrough(unit(sub(v, vertices[i - 1])), unit(sub(vertices[i + 1], v)))
  })
  // How much of the segment before vertex i a corner at i may use.
  const available = (i: number, other: number): number => {
    const segment = len(sub(vertices[i], vertices[other]))
    return corner[other] ? segment / 2 : segment * 0.9
  }

  const parts: string[] = [`M${fmt(vertices[0].x)} ${fmt(vertices[0].y)}`]
  for (let i = 1; i < vertices.length - 1; i++) {
    const prev = vertices[i - 1]
    const here = vertices[i]
    const next = vertices[i + 1]
    if (!corner[i]) {
      parts.push(`L${fmt(here.x)} ${fmt(here.y)}`)
      continue
    }
    const inDir = unit(sub(here, prev))
    const outDir = unit(sub(next, here))
    const r = Math.min(radius, available(i, i - 1), available(i, i + 1))
    const start = add(here, inDir, -r)
    const end = add(here, outDir, r)
    parts.push(`L${fmt(start.x)} ${fmt(start.y)}`, `Q${fmt(here.x)} ${fmt(here.y)} ${fmt(end.x)} ${fmt(end.y)}`)
  }
  const last = vertices[vertices.length - 1]
  parts.push(`L${fmt(last.x)} ${fmt(last.y)}`)
  return parts.join(" ")
}

/**
 * Station names are "City - Station" in every language; on the map they read
 * as two short lines, the way the original sets them, instead of one long one.
 */
export const stationLabelLines = (name: string, maxLineLength = LABEL_BREAK_LENGTH, stationNameOnly = false): string[] => {
  const split = name
    .split(/\s+[-–]\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  const parts = (stationNameOnly && split.length > 1 ? split.slice(1) : split).slice(0, 2)
  // A long line ("Ben Gurion Airport", "Hod HaSharon") breaks at the space nearest its middle.
  const broken = (parts.length > 0 ? parts : [name]).flatMap((line) => {
    if (line.length <= maxLineLength) return [line]
    const spaces = [...line.matchAll(/\s/g)].map((m) => m.index as number)
    if (spaces.length === 0) return [line]
    const middle = line.length / 2
    const at = spaces.reduce((best, i) => (Math.abs(i - middle) < Math.abs(best - middle) ? i : best), spaces[0])
    return [line.slice(0, at), line.slice(at + 1)]
  })
  return broken.slice(0, 4)
}

// --- the model ------------------------------------------------------------------------

const MITRE_LIMIT = LANE_WIDTH * 8

let cachedModel: RailMapModel | undefined

export const buildRailMapModel = (): RailMapModel => {
  if (cachedModel) return cachedModel

  // 1. Route every line through the track graph.
  const routes = new Map<RailLineId, string[]>()
  for (const line of RAIL_LINES) {
    const nodeIds: string[] = []
    for (let i = 0; i < line.stationIds.length - 1; i++) {
      const hop = shortestPath(line.stationIds[i], line.stationIds[i + 1])
      if (!hop) throw new Error(`No track between ${line.stationIds[i]} and ${line.stationIds[i + 1]} for line ${line.id}`)
      nodeIds.push(...(nodeIds.length === 0 ? hop : hop.slice(1)))
    }
    routes.set(line.id, nodeIds)
  }

  // 2. Which lines share each edge, in lane order (east to west facing south).
  const lanesByEdge = new Map<string, RailLineId[]>()
  for (const [lineId, nodeIds] of routes) {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const key = edgeKey(nodeIds[i], nodeIds[i + 1])
      const lanes = lanesByEdge.get(key) ?? []
      if (!lanes.includes(lineId)) lanes.push(lineId)
      lanesByEdge.set(key, lanes)
    }
  }
  for (const [key, lanes] of lanesByEdge) lanes.sort((a, b) => laneRank(a, key) - laneRank(b, key))

  /** Where a line sits on an edge, at a node: the node shifted along the edge's normal by the lane offset. */
  const lanePosition = (lineId: RailLineId, at: string, other: string): Point => {
    const key = edgeKey(at, other)
    const lanes = lanesByEdge.get(key) ?? [lineId]
    const offset = (lanes.indexOf(lineId) - (lanes.length - 1) / 2) * LANE_WIDTH
    return add(point(at), edgeFrame(at, other).normal, offset)
  }

  /**
   * Where a line ends. Normally its lane on the edge it arrives by; but a line
   * that terminates beside a bundle it does not run in (the red loop at
   * Herzliya, the Rishon shuttle at Lod, the Dimona line at Be'er Sheva North)
   * sits one lane beyond that bundle, on the side it leaves towards — the way
   * the original draws those terminals.
   */
  const terminalPosition = (lineId: RailLineId, at: string, next: string): Point => {
    const own = edgeKey(at, next)
    let busiest: { key: string; other: string; lanes: RailLineId[] } | undefined
    for (const other of adjacency.get(at) ?? []) {
      const key = edgeKey(at, other)
      const lanes = lanesByEdge.get(key) ?? []
      if (!busiest || lanes.length > busiest.lanes.length) busiest = { key, other, lanes }
    }
    if (!busiest || busiest.key === own || busiest.lanes.includes(lineId) || busiest.lanes.length === 0) {
      return lanePosition(lineId, at, next)
    }
    const { normal } = edgeFrame(at, busiest.other)
    const towards = sub(point(next), point(at))
    const side = towards.x * normal.x + towards.y * normal.y >= 0 ? 1 : -1
    const beyond = ((busiest.lanes.length - 1) / 2 + 1) * LANE_WIDTH
    return add(point(at), normal, side * beyond)
  }

  const sameLanes = (a: RailLineId[] | undefined, b: RailLineId[] | undefined): boolean =>
    !!a && !!b && a.length === b.length && a.every((id, i) => id === b[i])

  // 3. Lane polylines: mitred where a bundle bends, anchored to the busier bundle where lanes split or reorder.
  const lines: LinePath[] = []
  const lanePointsByNode = new Map<string, Point[]>()
  const callingByNode = new Map<string, { lineId: RailLineId; point: Point }[]>()

  for (const line of RAIL_LINES) {
    const nodeIds = routes.get(line.id) as string[]
    const vertices: Point[] = nodeIds.map((id, i) => {
      if (i === 0) return terminalPosition(line.id, id, nodeIds[1])
      if (i === nodeIds.length - 1) return terminalPosition(line.id, id, nodeIds[i - 1])
      const before = nodeIds[i - 1]
      const after = nodeIds[i + 1]
      const lanesIn = lanesByEdge.get(edgeKey(before, id))
      const lanesOut = lanesByEdge.get(edgeKey(id, after))
      if (sameLanes(lanesIn, lanesOut)) {
        const a = lanePosition(line.id, before, id)
        const b = lanePosition(line.id, id, before)
        const c = lanePosition(line.id, id, after)
        const d = lanePosition(line.id, after, id)
        const hit = intersect(a, b, c, d)
        return !hit || len(sub(hit, point(id))) > MITRE_LIMIT ? mid(b, c) : hit
      }
      // The line keeps the lane it holds in the busier bundle; the other edge peels away from there.
      const busierIsIn = (lanesIn?.length ?? 0) >= (lanesOut?.length ?? 0)
      return lanePosition(line.id, id, busierIsIn ? before : after)
    })

    const vertexIndex = new Map<string, number>()
    nodeIds.forEach((id, i) => {
      vertexIndex.set(id, i)
      lanePointsByNode.set(id, [...(lanePointsByNode.get(id) ?? []), vertices[i]])
      if (line.stationIds.includes(id)) {
        callingByNode.set(id, [...(callingByNode.get(id) ?? []), { lineId: line.id, point: vertices[i] }])
      }
    })

    lines.push({ lineId: line.id, line, nodeIds, vertices, d: roundedPathD(vertices), vertexIndex })
  }

  // 4. Station markers and label anchors.
  const markers: StationMarker[] = []
  const labels: StationLabel[] = []

  for (const node of MAP_NODES) {
    if (!node.label) continue // junction waypoint
    const calling = callingByNode.get(node.id) ?? []
    if (calling.length === 0) continue

    const center = { x: node.x, y: node.y }
    const lanePoints = calling.map((c) => c.point)
    const allPoints = lanePointsByNode.get(node.id) ?? lanePoints

    // An interchange pill lies across the busiest track through the station,
    // so a branch leaving at an angle does not tilt it; its dots are the lane
    // points projected onto that axis.
    const axis = busiestNormal(node.id, lanesByEdge)
    const along = (p: Point): number => (p.x - center.x) * axis.x + (p.y - center.y) * axis.y
    const projected = lanePoints.map((p) => add(center, axis, along(p)))
    const extents = projected.map(along)
    const a = add(center, axis, Math.min(...extents))
    const b = add(center, axis, Math.max(...extents))
    const kind = calling.length > 1 ? "capsule" : "single"
    const radius = MARKER_RADIUS
    const clearance = kind === "capsule" ? CAPSULE_RADIUS : MARKER_RADIUS
    // Labels clear the row of dots on their own axis: its horizontal extent
    // for a label beside it, its vertical extent for one above or below.
    const ends = kind === "capsule" ? [a, b] : [center]
    const extent = (pick: (p: Point) => number): number =>
      Math.max(...allPoints.map((p) => Math.abs(pick(p) - pick(center))), ...ends.map((p) => Math.abs(pick(p) - pick(center)))) +
      clearance +
      0.3
    const halfWidth = node.label === "left" || node.label === "right" ? extent((p) => p.x) : extent((p) => p.y)

    markers.push({
      stationId: node.id,
      center,
      lanePoints: kind === "capsule" ? projected : lanePoints,
      lineIds: calling.map((c) => c.lineId),
      kind,
      a: kind === "capsule" ? a : lanePoints[0],
      b: kind === "capsule" ? b : lanePoints[0],
      radius,
      halfWidth,
    })

    const gap = 0.9
    const base: Point =
      node.label === "left"
        ? { x: node.x - halfWidth - gap, y: node.y }
        : node.label === "right"
          ? { x: node.x + halfWidth + gap, y: node.y }
          : node.label === "above"
            ? { x: node.x, y: node.y - halfWidth - gap }
            : { x: node.x, y: node.y + halfWidth + gap }
    const anchor = node.labelOffset ? add(base, node.labelOffset) : base
    const fontScale = node.small ? SMALL_LABEL_SCALE : 1
    labels.push({
      stationId: node.id,
      side: node.label,
      anchor,
      maxWidth: LABEL_MAX_WIDTH * fontScale,
      fontScale,
      stationNameOnly: node.stationNameOnly === true,
    })
  }

  cachedModel = { bounds: MAP_BOUNDS, lines, markers, labels, nodeById }
  return cachedModel
}

/** The right-hand normal of the edge at a node that carries the most lines (the "trunk" there). */
const busiestNormal = (nodeId: string, lanesByEdge: Map<string, RailLineId[]>): Point => {
  let best: { count: number; normal: Point } | undefined
  for (const next of adjacency.get(nodeId) ?? []) {
    const count = lanesByEdge.get(edgeKey(nodeId, next))?.length ?? 0
    if (!best || count > best.count) best = { count, normal: edgeFrame(nodeId, next).normal }
  }
  return best?.normal ?? { x: 1, y: 0 }
}

// --- queries ----------------------------------------------------------------------------

/** The rounded path of a line between two of its stations (inclusive), or undefined if either is not on it. */
export const linePathBetween = (line: LinePath, fromStationId: string, toStationId: string): string | undefined => {
  const from = line.vertexIndex.get(fromStationId)
  const to = line.vertexIndex.get(toStationId)
  if (from === undefined || to === undefined) return undefined
  const [lo, hi] = from <= to ? [from, to] : [to, from]
  return roundedPathD(line.vertices.slice(lo, hi + 1))
}

/** Points on the line's lane for each of the given stations, skipping ones not on the line. */
export const lineStationPoints = (line: LinePath, stationIds: string[]): Point[] =>
  stationIds.flatMap((id) => {
    const at = line.vertexIndex.get(id)
    return at === undefined ? [] : [line.vertices[at]]
  })

const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const ab = sub(b, a)
  const l2 = ab.x * ab.x + ab.y * ab.y
  if (l2 === 0) return len(sub(p, a))
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2))
  return len(sub(p, add(a, ab, t)))
}

/** The line closest to a point (in layout units), when within `maxDistance`. */
export const nearestLine = (
  model: RailMapModel,
  p: Point,
  maxDistance: number,
): { lineId: RailLineId; distance: number } | undefined => {
  let best: { lineId: RailLineId; distance: number } | undefined
  for (const line of model.lines) {
    for (let i = 0; i < line.vertices.length - 1; i++) {
      const distance = distanceToSegment(p, line.vertices[i], line.vertices[i + 1])
      if (distance <= maxDistance && (!best || distance < best.distance)) best = { lineId: line.lineId, distance }
    }
  }
  return best
}
