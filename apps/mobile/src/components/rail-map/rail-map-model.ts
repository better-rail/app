/**
 * Turns the grid layout in data/rail-map-layout.ts into what the renderer
 * draws: an octilinear schematic in the manner of TfL Go. Lines that share a
 * stretch of track run as parallel lanes, bends are concentric arcs, and
 * every station is marked on the lanes that call there — a white capsule
 * across them, or a tick beside a lone line — with its name beside it.
 *
 * Pure TypeScript with no Skia or React imports: the renderer draws whatever
 * comes out of here, and scripts/rail-map-preview.ts renders the same model
 * to an SVG to check the layout without a device. Everything is in map units
 * (grid cells × CELL).
 */
import { type RailLine, type RailLineId, RAIL_LINES } from "@/data/rail-lines"
import {
  AIRPORT,
  CELL,
  CITY_FRAMES,
  type CityFrame,
  LANE_RANK,
  LANE_RANK_OVERRIDES,
  type LabelSide,
  type MapNode,
  NODES,
  ROUTES,
  type Route,
  type Waypoint,
} from "@/data/rail-map-layout"
import { type DayType, type LineStation, SERVICE_PATTERNS } from "@/data/rail-service-patterns"

export type { DayType } from "@/data/rail-service-patterns"

export type Point = { x: number; y: number }

// --- proportions, in map units ------------------------------------------------------------
/** Stroke width of a line. */
export const LINE_STROKE = 0.62
/** The ground-coloured casing under every line, so a line crossing another is outlined. */
export const LINE_CASING = LINE_STROKE + 0.36
/** Distance between the centres of neighbouring lanes. */
export const LANE_GAP = 1.05
/** Radius of a bend on the centre lane; the other lanes' bends are concentric with it. */
export const CORNER_RADIUS = 3
/** The station capsule: its width across a lane, and the ring around its white fill. */
export const CAPSULE_WIDTH = 1.55
export const CAPSULE_RING = 0.24
/** The disruption badge that takes a marker's place on an affected lane: its radius, just over the capsule's. */
export const BADGE_RADIUS = 0.92
/** The dot inside a terminal's capsule. */
export const TERMINAL_DOT_RADIUS = 0.27
/** The tick beside a lone line's station: how far it reaches from the line's edge, and its width. */
export const TICK_LENGTH = 0.8
export const TICK_WIDTH = 0.28
/** Station names: one size for every station, scaled down for Latin and Cyrillic capitals. */
export const LABEL_FONT_SIZE = 1.9
export const LATIN_SCALE = 0.85
export const LABEL_LINE_HEIGHT = 1.05
/** Room between a marker and its name. */
export const LABEL_GAP = 0.55
/** Wrap width of a name beside a station, and of one above or below it. */
export const LABEL_MAX_WIDTH = 12.5
export const LABEL_MAX_WIDTH_STACKED = 11
/** The frames around the big cities: the name inside, the room around the stations, the corner radius and stroke. */
export const CITY_FONT_SIZE = 2.3
export const FRAME_PADDING = 1.2
export const FRAME_RADIUS = 2.2
export const FRAME_STROKE = 0.24
/** Blank margin around the nodes for the outermost names, in cells: left, right, top, bottom. */
const MARGIN = { left: 3.6, right: 3.9, top: 1.6, bottom: 1.6 }

export const isRtlScript = (text: string): boolean => /[\u0590-\u06FF]/.test(text)
/** The size a name is set at, scaled down for Latin/Cyrillic script. */
export const nameFontSize = (text: string): number => LABEL_FONT_SIZE * (isRtlScript(text) ? 1 : LATIN_SCALE)

// --- model types -----------------------------------------------------------------------
export type LinePath = {
  lineId: RailLineId
  line: RailLine
  /** The lane's polyline, bends unrounded (for hit tests and cutting stretches out). */
  vertices: Point[]
  /** The lane offset each vertex was drawn at, for rounding a stretch's bends the same way. */
  offsets: number[]
  /** SVG path data of the lane with its bends rounded. */
  d: string
  /** Index into `vertices` of the point on the lane where the line meets each station. */
  stationIndex: Map<string, number>
}

export type MarkerKind =
  /** A calling point. */
  | "stop"
  /** Trains may pass without stopping: a disc with a grey ring. */
  | "irregular"
  /** Trains may pass without stopping: a dashed ring. */
  /** Trains of the line end here: a dot in the capsule. */
  | "terminal"

/** One line's lane through a station. */
export type StationLane = {
  lineId: RailLineId
  point: Point
  /** Whether the line calls there on the day's timetable; if not, it only runs through. */
  calls: boolean
  kind: MarkerKind
}

export type StationMark = {
  stationId: string
  /** The station's grid position. */
  node: Point
  /** The middle of its calling lanes: where the view centres on it. */
  centre: Point
  /** Every served line through the station, west to east (or south to north), with where it runs. */
  lanes: StationLane[]
  /** White capsules over runs of neighbouring calling lanes (a run of one is a disc). */
  capsules: { from: Point; to: Point }[]
  /** Lanes trains may pass: a disc of their own, ringed in grey. */
  irregular: Point[]
  /** Lanes with a terminal dot. */
  terminals: Point[]
  /** A lone line's plain stop: drawn as a tick beside the line (see tickFor) instead of a capsule. */
  lone: boolean
  /** The marker's ink, for taps and the selection halo. */
  box: Box
  /** The marker with every lane through the station, calling or not: what its name keeps clear of. */
  clear: Box
}

/** A station's name, before it is placed: which side it should go on if it fits. */
export type StationLabel = {
  stationId: string
  preferred: LabelSide
  stationNameOnly: boolean
}

export type TextSize = { width: number; height: number }

/** A station's name, placed: the side it went on, where its text is anchored and the box its ink fills. */
export type PlacedLabel = {
  stationId: string
  side: LabelSide
  /** For `left` the text ends here, for `right` it starts here (both centred on y); above and below it is centred on x. */
  anchor: Point
  /** The width the text was wrapped to. */
  maxWidth: number
  box: Box
  stationNameOnly: boolean
}

export type Box = { left: number; top: number; right: number; bottom: number }

export type CityFrameBox = CityFrame & {
  box: Box
  /** The left edge and baseline of the city's name, inside the frame's bottom-left corner. */
  caption: Point
}

export type RailMapModel = {
  dayType: DayType
  bounds: { width: number; height: number }
  lines: LinePath[]
  marks: StationMark[]
  /** The names to place: see placeLabels. */
  labels: StationLabel[]
  airport: { stationId: string; height: number }
}

// --- geometry helpers --------------------------------------------------------------------
const fmt = (n: number): string => (Math.round(n * 1000) / 1000).toString()
const EPS = 1e-6

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })
const len = (a: Point): number => Math.hypot(a.x, a.y)
const unit = (a: Point): Point => {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}
const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x
const same = (a: Point, b: Point): boolean => Math.abs(a.x - b.x) < EPS && Math.abs(a.y - b.y) < EPS
/** The normal to the left of `d` as drawn on screen (y down): east of a line heading south. */
const leftNormal = (d: Point): Point => ({ x: d.y, y: -d.x })

type Line2 = { p: Point; d: Point }

/** Where two lines meet; undefined when parallel. */
const intersect = (a: Line2, b: Line2): Point | undefined => {
  const denom = cross(a.d, b.d)
  if (Math.abs(denom) < EPS) return undefined
  const t = cross(sub(b.p, a.p), b.d) / denom
  return add(a.p, mul(a.d, t))
}

/** Signed distance of `p` from the line, along its left normal. */
const offsetFrom = (line: Line2, p: Point): number => {
  const n = leftNormal(line.d)
  return (p.x - line.p.x) * n.x + (p.y - line.p.y) * n.y
}

/** SVG path data through `points` with straight segments. */
export const polylineD = (points: Point[]): string =>
  points.map((p, i) => `${i === 0 ? "M" : "L"}${fmt(p.x)} ${fmt(p.y)}`).join(" ")

/**
 * SVG path data through `points` with every bend an arc. The radius on the
 * centre lane is `radius`; a vertex drawn at a lane offset gets a radius
 * shifted by it so parallel lanes bend concentrically. Radii shrink where a
 * neighbouring segment is too short.
 */
export const roundedPathD = (points: Point[], offsets?: number[], radius = CORNER_RADIUS, close = false): string => {
  const n = points.length
  if (n < 3) return polylineD(points)
  const pt = (p: Point) => `${fmt(p.x)} ${fmt(p.y)}`
  /** The arc at vertex `i`: where it starts and ends and how it turns; undefined where the path runs straight on. */
  const corner = (i: number) => {
    const a = points[(i - 1 + n) % n]
    const v = points[i]
    const b = points[(i + 1) % n]
    const din = sub(v, a)
    const dout = sub(b, v)
    const l1 = len(din)
    const l2 = len(dout)
    if (l1 < EPS || l2 < EPS) return undefined
    const u1 = mul(din, 1 / l1)
    const u2 = mul(dout, 1 / l2)
    const turn = cross(u1, u2)
    const dot = u1.x * u2.x + u1.y * u2.y
    if (Math.abs(turn) < 1e-4 && dot > 0) return undefined
    // Deflection angle; the tangent length from the vertex is r·tan(φ/2).
    const phi = Math.atan2(Math.abs(turn), dot)
    const tan = Math.tan(phi / 2)
    const offset = offsets?.[i] ?? 0
    // A lane on the outside of the bend gets a larger radius: right turns (turn > 0) have the east lanes outside.
    let r = Math.max(0.35, radius + offset * (turn > 0 ? 1 : -1))
    const room = Math.min(l1, l2) / 2
    if (r * tan > room) r = room / tan
    const t = r * tan
    return { s: sub(v, mul(u1, t)), e: add(v, mul(u2, t)), r, sweep: turn > 0 ? 1 : 0 }
  }
  const parts: string[] = []
  const first = close ? 0 : 1
  const last = close ? n - 1 : n - 2
  if (!close) parts.push(`M${pt(points[0])}`)
  for (let i = first; i <= last; i++) {
    const c = corner(i)
    const move = parts.length === 0
    if (!c) {
      parts.push(`${move ? "M" : "L"}${pt(points[i])}`)
      continue
    }
    parts.push(`${move ? "M" : "L"}${pt(c.s)}`, `A${fmt(c.r)} ${fmt(c.r)} 0 0 ${c.sweep} ${pt(c.e)}`)
  }
  parts.push(close ? "Z" : `L${pt(points[n - 1])}`)
  return parts.join(" ")
}

// --- the graph ------------------------------------------------------------------------
type Hop = {
  key: string
  /** The nodes the hop runs between, `from` nearer Nahariya. */
  from: string
  to: string
  /** The hop's centre line from `from` to `to`, in map units, bend points included. */
  points: Point[]
  lines: RailLineId[]
}

const hopKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

const isWaypoint = (step: string | Waypoint): step is Waypoint => Array.isArray(step)

let originCache: Point | undefined
/** The map's origin: the node positions shift so the leftmost, topmost names fit. */
const origin = (): Point => {
  if (originCache) return originCache
  const nodes = Object.values(NODES)
  originCache = {
    x: Math.min(...nodes.map((n) => n.x)) - MARGIN.left,
    y: Math.min(...nodes.map((n) => n.y)) - MARGIN.top,
  }
  return originCache
}

/** A grid position in map units. */
const toUnits = (cell: { x: number; y: number }): Point => {
  const o = origin()
  return { x: (cell.x - o.x) * CELL, y: (cell.y - o.y) * CELL }
}

export const nodePoint = (id: string): Point => toUnits(NODES[id])

/** The node ids along a route, bends left out. */
export const routeNodes = (route: Route): string[] => route.filter((step): step is string => !isWaypoint(step))

type Graph = {
  hops: Map<string, Hop>
  /** Each line's hops in route order, with whether it travels each one from `from` to `to`. */
  lineHops: Map<RailLineId, { hop: Hop; forward: boolean }[]>
  /** The hops at each node. */
  nodeHops: Map<string, Hop[]>
}

let graphCache: Graph | undefined

/** The hops of the whole network, oriented away from Nahariya, built once. */
const graph = (): Graph => {
  if (graphCache) return graphCache
  const hops = new Map<string, Hop>()
  const nodeHops = new Map<string, Hop[]>()
  const pending = new Map<RailLineId, { key: string; a: string; b: string; bends: Point[] }[]>()

  for (const line of RAIL_LINES) {
    const route = ROUTES[line.id]
    const steps: { key: string; a: string; b: string; bends: Point[] }[] = []
    let current: string | undefined
    let bends: Point[] = []
    for (const step of route) {
      if (isWaypoint(step)) {
        bends.push(toUnits({ x: step[0], y: step[1] }))
        continue
      }
      if (!NODES[step]) throw new Error(`rail-map-layout: line ${line.id} routes through unknown node ${step}`)
      if (current) steps.push({ key: hopKey(current, step), a: current, b: step, bends })
      current = step
      bends = []
    }
    pending.set(line.id, steps)
    for (const s of steps) {
      let hop = hops.get(s.key)
      if (!hop) {
        hop = { key: s.key, from: s.a, to: s.b, points: [nodePoint(s.a), ...s.bends, nodePoint(s.b)], lines: [] }
        hops.set(s.key, hop)
        for (const id of [s.a, s.b]) nodeHops.set(id, [...(nodeHops.get(id) ?? []), hop])
      }
      hop.lines.push(line.id)
    }
  }

  // Orient every hop away from Nahariya: breadth first over the nodes.
  const depth = new Map<string, number>([["1600", 0]])
  const queue = ["1600"]
  while (queue.length) {
    const id = queue.shift() as string
    for (const hop of nodeHops.get(id) ?? []) {
      const other = hop.from === id ? hop.to : hop.from
      if (depth.has(other)) continue
      depth.set(other, (depth.get(id) ?? 0) + 1)
      queue.push(other)
    }
  }
  for (const hop of hops.values()) {
    const da = depth.get(hop.from) ?? Number.POSITIVE_INFINITY
    const db = depth.get(hop.to) ?? Number.POSITIVE_INFINITY
    const a = NODES[hop.from]
    const b = NODES[hop.to]
    const flip = db < da || (db === da && (b.y < a.y || (b.y === a.y && b.x < a.x)))
    if (flip) {
      hop.points.reverse()
      ;[hop.from, hop.to] = [hop.to, hop.from]
    }
  }

  const lineHops = new Map<RailLineId, { hop: Hop; forward: boolean }[]>()
  for (const [lineId, steps] of pending) {
    lineHops.set(
      lineId,
      steps.map((s) => {
        const hop = hops.get(s.key) as Hop
        return { hop, forward: hop.from === s.a }
      }),
    )
  }
  graphCache = { hops, lineHops, nodeHops }
  return graphCache
}

/** The lane rank of a line on a hop (both ends listed in an override) or at a node. */
const laneRank = (lineId: RailLineId, nodes: string[]): number => {
  const override = LANE_RANK_OVERRIDES.find((o) => o.lineId === lineId && nodes.every((n) => o.nodes.includes(n)))
  return override ? override.rank : LANE_RANK[lineId]
}

const colours = new Map(RAIL_LINES.map((line) => [line.id, line.color]))
const lineColour = (lineId: RailLineId): string => colours.get(lineId) as string

const byRank = (nodes: string[]) => (a: RailLineId, b: RailLineId) => laneRank(a, nodes) - laneRank(b, nodes)

/** Each hop's lanes, by hop key: every served line's offset from the hop's centre line, west to east. */
type Lanes = Map<string, Map<RailLineId, number>>

/**
 * Lays the lanes of every hop. The busiest hops are laid first, centred on
 * their centre line; a hop that carries straight on from a hop already laid
 * keeps the lanes the lines it shares with it had, so a bundle does not shift
 * when a line joins or leaves at its edge — a new line takes the slot its
 * rank gives it, and only the lines that must make room for it move over.
 */
const layLanes = (g: Graph, served: Set<RailLineId>): Lanes => {
  const count = (h: Hop) => h.lines.filter((l) => served.has(l)).length
  const pending = new Set([...g.hops.values()].filter((h) => count(h) > 0))
  const laid: Lanes = new Map()

  /** The lanes the hop's lines already have on a laid hop that runs straight into it, if any. */
  const carriedOver = (hop: Hop, lines: RailLineId[]): Map<RailLineId, number> | undefined => {
    let best: Map<RailLineId, number> | undefined
    for (const node of [hop.from, hop.to]) {
      const direction = hopDirectionAt(hop, node)
      for (const other of g.nodeHops.get(node) ?? []) {
        const offsets = laid.get(other.key)
        if (other === hop || !offsets) continue
        const otherDirection = hopDirectionAt(other, node)
        const dot = direction.x * otherDirection.x + direction.y * otherDirection.y
        if (Math.abs(dot) < 0.999) continue
        // Both hops run the same way through the node, or both start (or end) there, which flips the frame.
        const common = lines.filter((l) => offsets.has(l))
        if (common.length === 0 || (best && common.length <= best.size)) continue
        best = new Map(common.map((l) => [l, dot > 0 ? (offsets.get(l) as number) : -(offsets.get(l) as number)]))
      }
    }
    return best
  }

  /**
   * A lone line turning off a laid hop keeps to its lane through the bend: its
   * hop's centre line is shifted so it passes the point where the line met
   * the node, rather than the node itself.
   */
  const turnedOff = (hop: Hop, line: RailLineId): number | undefined => {
    // The busiest laid hop the line comes from: a lone line joining a bundle follows the bundle's lane.
    let best: { offset: number; lines: number } | undefined
    for (const node of [hop.from, hop.to]) {
      for (const other of g.nodeHops.get(node) ?? []) {
        const offset = laid.get(other.key)?.get(line)
        if (other === hop || offset === undefined || (best && count(other) <= best.lines)) continue
        const nP = leftNormal(hopDirectionAt(other, node))
        const nH = leftNormal(hopDirectionAt(hop, node))
        best = { offset: offset * (nP.x * nH.x + nP.y * nH.y), lines: count(other) }
      }
    }
    return best?.offset
  }

  /** Whether a bundle (a hop of several colours) meets the hop and is not yet laid: a lone line waits for it. */
  const awaitsBundle = (hop: Hop) =>
    [hop.from, hop.to].some((node) =>
      (g.nodeHops.get(node) ?? []).some(
        (other) =>
          other !== hop && !laid.has(other.key) && new Set(other.lines.filter((l) => served.has(l)).map(lineColour)).size > 1,
      ),
    )

  /** What a hop inherits from the hops already laid, if anything. */
  const linked = (hop: Hop, lines: RailLineId[]) =>
    carriedOver(hop, lines) ??
    (new Set(lines.map(lineColour)).size === 1 && !awaitsBundle(hop) && turnedOff(hop, lines[0]) !== undefined
      ? new Map()
      : undefined)

  while (pending.size) {
    // A hop carrying on from one already laid comes first, busiest first, so one bundle spreads through the whole
    // network before a new one is centred; only a hop no laid hop runs into is centred on its own line.
    const next = [...pending].sort((a, b) => {
      const la = a.lines.filter((l) => served.has(l))
      const lb = b.lines.filter((l) => served.has(l))
      const joined = (linked(b, lb) ? 1 : 0) - (linked(a, la) ? 1 : 0)
      return joined || count(b) - count(a) || a.key.localeCompare(b.key)
    })[0]
    pending.delete(next)
    const lines = next.lines.filter((l) => served.has(l)).sort(byRank([next.from, next.to]))
    // Lines of one colour share a lane: the slots go to the colours, in the order of their first line.
    const colours = [...new Set(lines.map(lineColour))]
    const slot = (l: RailLineId) => colours.indexOf(lineColour(l))
    const centred = -((colours.length - 1) / 2) * LANE_GAP
    const kept = carriedOver(next, lines)
    let start = centred
    if (!kept && colours.length === 1) start = turnedOff(next, lines[0]) ?? centred
    if (kept) {
      // Slots by rank; shifted so that as many carried-over lines as possible stay in their lanes.
      const shifts = lines.flatMap((l) => (kept.has(l) ? [(kept.get(l) as number) - slot(l) * LANE_GAP] : []))
      const tally = new Map<number, number>()
      for (const shift of shifts) {
        const rounded = Math.round(shift * 1e4) / 1e4
        tally.set(rounded, (tally.get(rounded) ?? 0) + 1)
      }
      const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1])
      if (ranked.length === 1 || ranked[0][1] > ranked[1][1]) start = ranked[0][0]
      else {
        // No majority (two lines swapping): keep the bundle where it is and let both move a lane.
        const keptLines = lines.filter((l) => kept.has(l))
        const meanOffset = keptLines.reduce((sum, l) => sum + (kept.get(l) as number), 0) / keptLines.length
        const meanSlot = keptLines.reduce((sum, l) => sum + slot(l), 0) / keptLines.length
        start = meanOffset - meanSlot * LANE_GAP
      }
    }
    laid.set(next.key, new Map(lines.map((l) => [l, start + slot(l) * LANE_GAP])))
  }
  return laid
}

/** The direction of a hop where it meets `node`, pointing the way the hop runs. */
const hopDirectionAt = (hop: Hop, node: string): Point => {
  const pts = hop.points
  return node === hop.from ? unit(sub(pts[1], pts[0])) : unit(sub(pts[pts.length - 1], pts[pts.length - 2]))
}

/** A hop's segments as lines, each shifted by `offset` along its left normal, from `from` to `to`. */
const offsetSegments = (hop: Hop, offset: number): Line2[] => {
  const out: Line2[] = []
  for (let i = 0; i + 1 < hop.points.length; i++) {
    const d = unit(sub(hop.points[i + 1], hop.points[i]))
    out.push({ p: add(hop.points[i], mul(leftNormal(d), offset)), d })
  }
  return out
}

type NodeLanes = {
  /** The direction of the busiest hop through the node: the axis the lanes line up across. */
  axis: Point
  /** The busiest hop. */
  primary: Hop
  /** Each served line's offset across the axis and its point. */
  lanes: Map<RailLineId, { offset: number; point: Point }>
}

/**
 * Where each line passes a node: the lines of the busiest hop keep their lanes,
 * and a line only on other hops gets a lane just beyond the edge on its side.
 */
const nodeLanes = (id: string, served: Set<RailLineId>, g: Graph, lanes: Lanes): NodeLanes | undefined => {
  const hops = (g.nodeHops.get(id) ?? []).filter((h) => h.lines.some((l) => served.has(l)))
  if (hops.length === 0) return undefined
  const count = (h: Hop) => h.lines.filter((l) => served.has(l)).length
  // The busiest hop; of equals, one running straight (a marker across a diagonal looks tilted), then the one arriving.
  const straight = (h: Hop) => {
    const d = hopDirectionAt(h, id)
    return Math.abs(d.x) < 1e-6 || Math.abs(d.y) < 1e-6 ? 0 : 1
  }
  const primary = [...hops].sort(
    (a, b) => count(b) - count(a) || straight(a) - straight(b) || (a.to === id ? -1 : 1) - (b.to === id ? -1 : 1),
  )[0]
  const axis = hopDirectionAt(primary, id)
  const centre = nodePoint(id)
  const normal = leftNormal(axis)
  const offsets = new Map(lanes.get(primary.key) as Map<RailLineId, number>)
  const ranks = [...offsets.keys()].map((l) => laneRank(l, [id]))
  const meanRank = ranks.reduce((s, r) => s + r, 0) / ranks.length
  const edge = { min: Math.min(...offsets.values()), max: Math.max(...offsets.values()) }
  const extras = [...new Set(hops.flatMap((h) => h.lines))].filter((l) => served.has(l) && !offsets.has(l)).sort(byRank([id]))
  let west = edge.min
  let east = edge.max
  // Lower ranks go west, taken from the innermost outwards; higher ranks east.
  for (const l of extras.filter((l) => laneRank(l, [id]) < meanRank).reverse()) offsets.set(l, (west -= LANE_GAP))
  for (const l of extras.filter((l) => laneRank(l, [id]) >= meanRank)) offsets.set(l, (east += LANE_GAP))
  const placed = new Map<RailLineId, { offset: number; point: Point }>()
  for (const [l, offset] of offsets) placed.set(l, { offset, point: add(centre, mul(normal, offset)) })

  // Where every line turns at the station (a bend, or lines merging into one track), each marker sits where its
  // lane's two segments meet, so the lanes bend cleanly through the markers instead of jinking to a cross-section.
  const bends = new Map<RailLineId, Point>()
  for (const l of placed.keys()) {
    const at = hops.filter((h) => h.lines.includes(l))
    if (at.length !== 2) break
    const [a, b] = at.map((h) => ({
      p: add(hopPointAt(h, id), mul(leftNormal(hopDirectionAt(h, id)), lanes.get(h.key)?.get(l) ?? 0)),
      d: hopDirectionAt(h, id),
    }))
    const meet = intersect(a, b)
    if (!meet) break
    bends.set(l, meet)
  }
  if (bends.size === placed.size) for (const [l, point] of bends) placed.set(l, { offset: placed.get(l)?.offset ?? 0, point })
  return { axis, primary, lanes: placed }
}

/** The point of a hop's centre line at `node`: its first or last point. */
const hopPointAt = (hop: Hop, node: string): Point => (node === hop.from ? hop.points[0] : hop.points[hop.points.length - 1])

/**
 * How far a lane change is spread along the axis: a 45° traverse, unless the
 * hop is too short for it, then as long as the hop allows.
 */
const jogLength = (shift: number, room: number): number => Math.min(Math.abs(shift), Math.max(room, 0.5))
/** Room kept clear of a marker before a lane changes. */
const JOG_CLEARANCE = CAPSULE_WIDTH / 2 + 0.3

/**
 * A line's lane through the network: its point at every station, joined by the
 * offset hops between them. Where a hop's lane differs from the station's, the
 * lane meets the station's axis: at the bend where the hop turns, or, running
 * parallel, with a short traverse before or after the marker — or under it,
 * when every line calls there and the capsule hides the change. At a junction
 * there is no marker, and one hop's segment simply bends into the next's.
 */
const buildLane = (
  lineId: RailLineId,
  g: Graph,
  lanes: Lanes,
  lanesAt: Map<string, NodeLanes>,
  fullCapsules: Set<string>,
): { vertices: Point[]; offsets: number[]; stationIndex: Map<string, number> } => {
  const steps = g.lineHops.get(lineId) ?? []
  const nodes = routeNodes(ROUTES[lineId])
  const vertices: Point[] = []
  // Each vertex's lane offset, with the direction of the frame it was measured in (the hop's or the node axis).
  const framed: { offset: number; frame: Point }[] = []
  const stationIndex = new Map<string, number>()
  const push = (p: Point, offset: number, frame: Point) => {
    if (vertices.length && same(vertices[vertices.length - 1], p)) return
    vertices.push(p)
    framed.push({ offset, frame })
  }
  const at = (id: string) => {
    const nl = lanesAt.get(id)
    const lane = nl?.lanes.get(lineId)
    if (!nl || !lane) throw new Error(`rail-map-layout: line ${lineId} has no lane at ${id}`)
    return { axis: nl.axis, point: lane.point, offset: lane.offset }
  }
  const isJunction = (id: string) => !NODES[id].label
  const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
  /** The point of `line` nearest `p`. */
  const foot = (line: Line2, p: Point): Point => add(line.p, mul(line.d, dot(sub(p, line.p), line.d)))

  /** A hop segment's offset and frame: the offset is measured along the hop's own direction, whichever way the line travels. */
  type Seg = Line2 & { offset: number; frame: Point }

  /** The join between a station's lane and a hop's segment there. */
  const join = (node: string, seg: Seg, side: "in" | "out", room: number) => {
    const n = at(node)
    const axisLine: Line2 = { p: n.point, d: n.axis }
    // The way the line travels along the station's axis here: with it, or against it (a stub doubling back).
    const travel = dot(seg.d, n.axis) >= 0 ? n.axis : mul(n.axis, -1)
    const dir = side === "in" ? -1 : 1
    const meet = intersect(axisLine, seg)
    if (meet) {
      const ahead = dot(sub(meet, n.point), travel)
      // The lane meets the hop past the marker (leaving) or before it (arriving): a plain bend.
      if (side === "out" ? ahead >= -EPS : ahead <= EPS) {
        push(meet, seg.offset, seg.frame)
        return
      }
      // Otherwise the bend would fall behind the marker: run on past it and cut across to the hop's lane.
      const near = add(n.point, mul(travel, dir * JOG_CLEARANCE))
      if (side === "in") {
        push(foot(seg, near), seg.offset, seg.frame)
        push(near, n.offset, n.axis)
      } else {
        push(near, n.offset, n.axis)
        push(foot(seg, near), seg.offset, seg.frame)
      }
      return
    }
    // Parallel: the same lane needs nothing; a different one is reached by a traverse.
    const shift = offsetFrom(axisLine, seg.p)
    if (Math.abs(shift) < EPS) return
    if (side === "out" && fullCapsules.has(node) && Math.abs(shift) <= LANE_GAP + EPS) {
      // Every line calls here: the capsule hides a change of one lane, so it crosses under the marker.
      const half = Math.abs(shift) / 2
      if (vertices.length && same(vertices[vertices.length - 1], n.point)) {
        vertices.pop()
        framed.pop()
      }
      push(sub(n.point, mul(travel, half)), n.offset, n.axis)
      stationIndex.set(node, vertices.length - 1)
      push(add(add(n.point, mul(travel, half)), mul(leftNormal(n.axis), shift)), seg.offset, seg.frame)
      return
    }
    const along = jogLength(shift, room - 2 * JOG_CLEARANCE)
    const near = add(n.point, mul(n.axis, dir * JOG_CLEARANCE))
    const far = add(add(near, mul(n.axis, dir * along)), mul(leftNormal(n.axis), shift))
    if (side === "in") {
      push(far, seg.offset, seg.frame)
      push(near, n.offset, n.axis)
    } else {
      push(near, n.offset, n.axis)
      push(far, seg.offset, seg.frame)
    }
  }

  /** At a junction the lane bends straight from one hop's segment into the next's; parallel lanes cross over at 45°. */
  const junctionJoin = (node: string, prev: Seg, next: Seg) => {
    const meet = intersect(prev, next)
    if (meet) {
      push(meet, next.offset, next.frame)
      return
    }
    const shift = offsetFrom(prev, next.p)
    if (Math.abs(shift) < EPS) return
    const centre = nodePoint(node)
    const half = Math.abs(shift) / 2
    push(foot(prev, sub(centre, mul(prev.d, half))), prev.offset, prev.frame)
    push(foot(next, add(centre, mul(prev.d, half))), next.offset, next.frame)
  }

  let prev: Seg | undefined
  steps.forEach(({ hop, forward }, i) => {
    const from = nodes[i]
    const to = nodes[i + 1]
    const offset = lanes.get(hop.key)?.get(lineId) ?? 0
    let segs: Seg[] = offsetSegments(hop, offset).map((s) => ({ ...s, offset, frame: s.d }))
    if (!forward) segs = [...segs].reverse().map((s) => ({ ...s, d: mul(s.d, -1) }))
    const hopLength = hop.points.reduce((sum, p, k) => (k ? sum + len(sub(p, hop.points[k - 1])) : 0), 0)
    if (isJunction(from)) {
      if (prev) junctionJoin(from, prev, segs[0])
      else push(foot(segs[0], nodePoint(from)), offset, segs[0].frame)
    } else {
      if (i === 0) {
        const start = at(from)
        push(start.point, start.offset, start.axis)
        stationIndex.set(from, vertices.length - 1)
      }
      join(from, segs[0], "out", hopLength)
    }
    // The bends inside the hop, where neighbouring offset segments meet.
    for (let k = 0; k + 1 < segs.length; k++) {
      const meet = intersect(segs[k], segs[k + 1])
      if (meet) push(meet, offset, segs[k].frame)
    }
    const last = segs[segs.length - 1]
    if (isJunction(to)) {
      if (i === steps.length - 1) push(foot(last, nodePoint(to)), offset, last.frame)
    } else {
      join(to, last, "in", hopLength)
      const end = at(to)
      push(end.point, end.offset, end.axis)
      stationIndex.set(to, vertices.length - 1)
    }
    prev = last
  })

  // Offsets as seen travelling the lane: a frame the line runs against flips the sign.
  const offsets = framed.map(({ offset, frame }, i) => {
    const next = vertices[Math.min(i + 1, vertices.length - 1)]
    const prior = vertices[Math.max(i - 1, 0)]
    const travel = sub(next, prior)
    return travel.x * frame.x + travel.y * frame.y < 0 ? -offset : offset
  })
  return { vertices, offsets, stationIndex }
}

// --- the model ------------------------------------------------------------------------
const key = (ls: LineStation) => `${ls.lineId}:${ls.stationId}`

const LABEL_DIRECTIONS: Record<LabelSide, Point> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  above: { x: 0, y: -1 },
  below: { x: 0, y: 1 },
}

const models = new Map<DayType, RailMapModel>()

/** The map for a day's timetable; built once per day type, since the inputs are static data. */
export const buildRailMapModel = (dayType: DayType = currentDayType()): RailMapModel => {
  const built = models.get(dayType) ?? buildModel(dayType)
  models.set(dayType, built)
  return built
}

const buildModel = (dayType: DayType): RailMapModel => {
  const g = graph()
  const pattern = SERVICE_PATTERNS[dayType]
  const served = new Set<RailLineId>(pattern.lines)
  const irregular = new Set(pattern.irregular.map(key))
  const shortWorkings = new Set(pattern.terminals.map(key))
  const runThrough = new Set(pattern.skipped.map(key))

  const lanes = layLanes(g, served)
  const lanesAt = new Map<string, NodeLanes>()
  for (const id of Object.keys(NODES)) {
    const at = nodeLanes(id, served, g, lanes)
    if (at) lanesAt.set(id, at)
  }

  const linesById0 = new Map(RAIL_LINES.map((line) => [line.id, line]))
  /** Whether the line calls at the station on the day's timetable. */
  const callsAt = (lineId: RailLineId, stationId: string) =>
    (linesById0.get(lineId) as RailLine).stationIds.includes(stationId) && !runThrough.has(key({ lineId, stationId }))
  // Stations every line through them calls at: their capsules span every lane and can hide a change of lane.
  const fullCapsules = new Set(
    [...lanesAt.entries()]
      .filter(([id, nl]) => NODES[id].label && [...nl.lanes.keys()].every((l) => callsAt(l, id)))
      .map(([id]) => id),
  )

  const lines: LinePath[] = RAIL_LINES.filter((line) => served.has(line.id)).map((line) => {
    const lane = buildLane(line.id, g, lanes, lanesAt, fullCapsules)
    return { lineId: line.id, line, ...lane, d: roundedPathD(lane.vertices, lane.offsets) }
  })
  const linesById = new Map(lines.map((l) => [l.lineId, l]))

  // Stations inside a city frame drop the city from their names.
  const framed = new Set(CITY_FRAMES.flatMap((f) => f.stations))
  const marks: StationMark[] = []
  const labels: StationLabel[] = []
  for (const [id, node] of Object.entries(NODES)) {
    if (!node.label) continue // a junction
    const nl = lanesAt.get(id)
    if (!nl) continue
    const lanes: StationLane[] = [...nl.lanes.entries()]
      .sort((a, b) => a[1].offset - b[1].offset || LANE_RANK[a[0]] - LANE_RANK[b[0]] || a[0].localeCompare(b[0]))
      .map(([lineId, lane]) => {
        const line = linesById.get(lineId)?.line as RailLine
        const ls = { lineId, stationId: id }
        const corridor = line.stationIds.indexOf(id)
        const calls = corridor >= 0 && !runThrough.has(key(ls))
        const terminal = corridor === 0 || corridor === line.stationIds.length - 1 || shortWorkings.has(key(ls))
        const kind: MarkerKind = irregular.has(key(ls)) ? "irregular" : terminal ? "terminal" : "stop"
        return { lineId, point: lane.point, calls, kind }
      })
    // Lines of one colour share a lane and a marker: a stop if either calls, a terminal if either ends.
    const merged: StationLane[] = []
    for (const lane of lanes) {
      const last = merged[merged.length - 1]
      if (last && same(last.point, lane.point)) {
        last.calls = last.calls || lane.calls
        if (lane.kind === "terminal" || (lane.kind === "stop" && last.kind === "irregular")) last.kind = lane.kind
      } else merged.push({ ...lane })
    }
    const calling = merged.filter((l) => l.calls)
    if (calling.length === 0) continue

    // Capsules over runs of neighbouring calling lanes; a lane trains may pass gets a ring of its own.
    const capsules: { from: Point; to: Point }[] = []
    let run: StationLane[] = []
    const flush = () => {
      if (run.length) capsules.push({ from: run[0].point, to: run[run.length - 1].point })
      run = []
    }
    for (const lane of merged) {
      if (lane.calls && lane.kind !== "irregular") run.push(lane)
      else flush()
    }
    flush()
    const irregularPoints = calling.filter((l) => l.kind === "irregular").map((l) => l.point)
    const terminals = calling.filter((l) => l.kind === "terminal").map((l) => l.point)

    const first = calling[0].point
    const last = calling[calling.length - 1].point
    const centre = { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }
    const lone = merged.length === 1 && calling[0].kind === "stop"
    let box: StationMark["box"]
    if (lone) {
      const half = LINE_STROKE / 2
      box = { left: first.x - half, right: first.x + half, top: first.y - half, bottom: first.y + half }
      capsules.length = 0
    } else {
      const half = CAPSULE_WIDTH / 2
      const xs = calling.map((l) => l.point.x)
      const ys = calling.map((l) => l.point.y)
      box = {
        left: Math.min(...xs) - half,
        right: Math.max(...xs) + half,
        top: Math.min(...ys) - half,
        bottom: Math.max(...ys) + half,
      }
    }
    // The name keeps clear of every lane through the station, calling or not.
    const half = CAPSULE_WIDTH / 2
    const clear: Box = {
      left: Math.min(box.left, ...lanes.map((l) => l.point.x - half)),
      right: Math.max(box.right, ...lanes.map((l) => l.point.x + half)),
      top: Math.min(box.top, ...lanes.map((l) => l.point.y - half)),
      bottom: Math.max(box.bottom, ...lanes.map((l) => l.point.y + half)),
    }
    marks.push({
      stationId: id,
      node: nodePoint(id),
      centre,
      lanes,
      capsules,
      irregular: irregularPoints,
      terminals,
      lone,
      box,
      clear,
    })
    labels.push({ stationId: id, preferred: node.label, stationNameOnly: framed.has(id) })
  }

  const nodes = Object.values(NODES)
  const o = origin()
  const bounds = {
    width: (Math.max(...nodes.map((n) => n.x)) + MARGIN.right - o.x) * CELL,
    height: (Math.max(...nodes.map((n) => n.y)) + MARGIN.bottom - o.y) * CELL,
  }

  return {
    dayType,
    bounds,
    lines,
    marks,
    labels,
    airport: { stationId: AIRPORT.stationId, height: AIRPORT.height * CELL },
  }
}

// --- names ------------------------------------------------------------------------
const opposite: Record<LabelSide, LabelSide> = { left: "right", right: "left", above: "below", below: "above" }
/** How far a name may slide along the marker to find room, in map units, nearest first. */
const SLIDES: Record<LabelSide, number[]> = {
  left: [0, -1, 1, -2, 2],
  right: [0, -1, 1, -2, 2],
  above: [0, -1.5, 1.5, -3, 3],
  below: [0, -1.5, 1.5, -3, 3],
}
/** Room kept between a name and anything else. */
const LABEL_CLEARANCE = 0.3
/** A little slack a name may take from a line's clearance rather than leave its station's row. */
const LABEL_SOFT_MARGIN = 0.35

/** The tick beside a lone line's stop, reaching out from the line's edge towards the name. */
export const tickFor = (mark: StationMark, side: LabelSide): { from: Point; to: Point } => {
  const dir = LABEL_DIRECTIONS[side]
  const from = add(mark.lanes[0].point, mul(dir, LINE_STROKE / 2))
  return { from, to: add(from, mul(dir, TICK_LENGTH)) }
}

/** The box a name of `size` fills when anchored at `anchor` on `side`. */
export const labelBox = (anchor: Point, side: LabelSide, size: TextSize): Box => {
  switch (side) {
    case "left":
      return { left: anchor.x - size.width, right: anchor.x, top: anchor.y - size.height / 2, bottom: anchor.y + size.height / 2 }
    case "right":
      return { left: anchor.x, right: anchor.x + size.width, top: anchor.y - size.height / 2, bottom: anchor.y + size.height / 2 }
    case "above":
      return { left: anchor.x - size.width / 2, right: anchor.x + size.width / 2, top: anchor.y - size.height, bottom: anchor.y }
    default:
      return { left: anchor.x - size.width / 2, right: anchor.x + size.width / 2, top: anchor.y, bottom: anchor.y + size.height }
  }
}

const grow = (b: Box, by: number): Box => ({ left: b.left - by, right: b.right + by, top: b.top - by, bottom: b.bottom + by })
const boxesOverlap = (a: Box, b: Box): boolean => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

const segmentsCross = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const o = (p: Point, q: Point, r: Point) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b)
}

/** Whether the segment comes within `by` of the box. */
const segmentHitsBox = (a: Point, b: Point, box: Box, by: number): boolean => {
  const r = grow(box, by)
  if (
    Math.max(a.x, b.x) < r.left ||
    Math.min(a.x, b.x) > r.right ||
    Math.max(a.y, b.y) < r.top ||
    Math.min(a.y, b.y) > r.bottom
  ) {
    return false
  }
  const inside = (p: Point) => p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom
  if (inside(a) || inside(b)) return true
  const tl = { x: r.left, y: r.top }
  const tr = { x: r.right, y: r.top }
  const bl = { x: r.left, y: r.bottom }
  const br = { x: r.right, y: r.bottom }
  return segmentsCross(a, b, tl, tr) || segmentsCross(a, b, tr, br) || segmentsCross(a, b, br, bl) || segmentsCross(a, b, bl, tl)
}

const pointSegmentDistance = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** How far the segment is from the box's edge (0 when it enters the box). */
const segmentBoxDistance = (a: Point, b: Point, box: Box): number => {
  if (segmentHitsBox(a, b, box, 0)) return 0
  const corners = [
    { x: box.left, y: box.top },
    { x: box.right, y: box.top },
    { x: box.right, y: box.bottom },
    { x: box.left, y: box.bottom },
  ]
  let d = Math.min(...corners.map((c) => pointSegmentDistance(c, a, b)))
  for (let i = 0; i < 4; i++) {
    d = Math.min(
      d,
      pointSegmentDistance(a, corners[i], corners[(i + 1) % 4]),
      pointSegmentDistance(b, corners[i], corners[(i + 1) % 4]),
    )
  }
  return d
}

/** Where a name on `side` of the marker is anchored, `LABEL_GAP` clear of it (and of its tick). */
const labelAnchor = (mark: StationMark, side: LabelSide): Point => {
  const reach = LABEL_GAP + (mark.lone ? Math.max(0, LINE_STROKE / 2 + TICK_LENGTH - CAPSULE_WIDTH / 2) : 0)
  const c = mark.clear
  switch (side) {
    case "left":
      return { x: c.left - reach, y: mark.centre.y }
    case "right":
      return { x: c.right + reach, y: mark.centre.y }
    case "above":
      return { x: mark.centre.x, y: c.top - reach }
    default:
      return { x: mark.centre.x, y: c.bottom + reach }
  }
}

/**
 * Places every station's name so it sits beside its marker without touching a
 * line, another marker, a city frame or another name. Each name tries its
 * preferred side first, then the opposite side, then the others, sliding a
 * little along the marker and wrapping narrower before giving up; if nothing
 * is clear it takes the least bad spot. The cities' names go first, so their
 * frames are known before the names around them are placed. `measure` gives
 * the size of a station's name wrapped to a width, in map units.
 */
export const placeLabels = (
  model: RailMapModel,
  measure: (stationId: string, maxWidth: number) => TextSize,
): { labels: PlacedLabel[]; frames: CityFrameBox[] } => {
  const segments: { a: Point; b: Point }[] = []
  for (const line of model.lines) {
    for (let i = 0; i + 1 < line.vertices.length; i++) segments.push({ a: line.vertices[i], b: line.vertices[i + 1] })
  }
  const marks = new Map(model.marks.map((m) => [m.stationId, m]))
  const placed: PlacedLabel[] = []
  const frames: CityFrameBox[] = []
  const bounds: Box = { left: 0, top: 0, right: model.bounds.width, bottom: model.bounds.height }

  const cost = (stationId: string, box: Box): number => {
    let hits = 0
    if (
      !boxesOverlap(grow(bounds, -LABEL_CLEARANCE), box) ||
      box.left < 0 ||
      box.top < 0 ||
      box.right > bounds.right ||
      box.bottom > bounds.bottom
    )
      hits += 10
    // A line's ink is out of bounds; its clearance around it is soft, so a graze costs less than leaving the row.
    const hard = LINE_STROKE / 2 + 0.1
    for (const s of segments) {
      const d = segmentBoxDistance(s.a, s.b, box) - hard
      if (d <= 0) hits += 8
      else if (d < LABEL_SOFT_MARGIN) hits += 1 - d / LABEL_SOFT_MARGIN
    }
    for (const m of model.marks) if (m.stationId !== stationId && boxesOverlap(grow(m.clear, LABEL_CLEARANCE), box)) hits += 8
    for (const l of placed) if (boxesOverlap(grow(l.box, LABEL_CLEARANCE), box)) hits += 6
    for (const f of frames) {
      const edge = f.box
      const corners = [
        { x: edge.left, y: edge.top },
        { x: edge.right, y: edge.top },
        { x: edge.right, y: edge.bottom },
        { x: edge.left, y: edge.bottom },
      ]
      for (let i = 0; i < 4; i++) if (segmentHitsBox(corners[i], corners[(i + 1) % 4], box, LABEL_CLEARANCE)) hits += 8
    }
    return hits
  }

  const place = (request: StationLabel) => {
    const mark = marks.get(request.stationId)
    if (!mark) return
    const sides: LabelSide[] = [request.preferred, opposite[request.preferred]]
    for (const side of ["left", "right", "above", "below"] as LabelSide[]) if (!sides.includes(side)) sides.push(side)
    let best: { label: PlacedLabel; score: number } | undefined
    sides.forEach((side, sideIndex) => {
      const full = side === "left" || side === "right" ? LABEL_MAX_WIDTH : LABEL_MAX_WIDTH_STACKED
      ;[full, full * 0.65].forEach((maxWidth, widthIndex) => {
        const size = measure(request.stationId, maxWidth)
        const base = labelAnchor(mark, side)
        for (const slide of SLIDES[side]) {
          const anchor = side === "left" || side === "right" ? { x: base.x, y: base.y + slide } : { x: base.x + slide, y: base.y }
          const box = labelBox(anchor, side, size)
          // A name level with its dot comes first: beside a vertical line, sliding costs more than wrapping, changing side
          // or grazing a line's clearance.
          const slideCost = side === "left" || side === "right" ? 1.6 : 0.4
          const score = cost(request.stationId, box) + sideIndex * 0.6 + Math.abs(slide) * slideCost + widthIndex * 0.5
          if (!best || score < best.score) {
            best = {
              label: { stationId: request.stationId, side, anchor, maxWidth, box, stationNameOnly: request.stationNameOnly },
              score,
            }
          }
          if (score < 0.5) return
        }
      })
    })
    if (best) placed.push(best.label)
  }

  // The cities' stations first, then their frames, then everything else, the busiest stations first.
  const framedIds = CITY_FRAMES.flatMap((f) => f.stations)
  const requests = new Map(model.labels.map((l) => [l.stationId, l]))
  for (const id of framedIds) {
    const request = requests.get(id)
    if (request) place(request)
  }
  frames.push(...cityFrames(model, placed))
  const rest = model.labels
    .filter((l) => !framedIds.includes(l.stationId))
    .sort((a, b) => {
      const ma = marks.get(a.stationId)
      const mb = marks.get(b.stationId)
      return (mb?.lanes.length ?? 0) - (ma?.lanes.length ?? 0) || (ma?.node.y ?? 0) - (mb?.node.y ?? 0)
    })
  for (const request of rest) place(request)
  return { labels: placed, frames }
}

/** The city frames: around their stations' markers and placed names, with room for the city's name at the bottom left. */
const cityFrames = (model: RailMapModel, placed: PlacedLabel[]): CityFrameBox[] =>
  CITY_FRAMES.flatMap((frame) => {
    const boxes: Box[] = []
    for (const id of frame.stations) {
      const mark = model.marks.find((m) => m.stationId === id)
      const label = placed.find((l) => l.stationId === id)
      if (!mark || !label) continue
      boxes.push(mark.box, label.box)
    }
    if (boxes.length === 0) return []
    // Room on the left for the city's name, so it sits clear of the stations' names and of lines leaving the frame.
    const captionWidth = Math.max(
      ...Object.values(frame.name).map((n) => n.length * CITY_FONT_SIZE * (isRtlScript(n) ? 0.5 : LATIN_SCALE * 0.55)),
    )
    const box: Box = {
      left: Math.min(...boxes.map((b) => b.left)) - FRAME_PADDING - captionWidth,
      top: Math.min(...boxes.map((b) => b.top)) - FRAME_PADDING,
      right: Math.max(...boxes.map((b) => b.right)) + FRAME_PADDING,
      bottom: Math.max(...boxes.map((b) => b.bottom)) + FRAME_PADDING + CITY_FONT_SIZE * 1.15,
    }
    return [{ ...frame, box, caption: { x: box.left + FRAME_PADDING, y: box.bottom - FRAME_PADDING } }]
  })

// --- queries ------------------------------------------------------------------------
/**
 * Which timetable applies now: Sunday to Thursday, or Friday and Saturday.
 * The service day rolls over at 03:00, so the last trains of a Thursday
 * night still count as weekday service.
 */
export const currentDayType = (now: Date = new Date()): DayType => {
  // The small hours after a Sunday–Thursday: the night trains, until the morning service starts.
  const weekday = now.getDay()
  if (weekday >= 1 && weekday <= 5 && now.getHours() * 60 + now.getMinutes() < NIGHT_UNTIL_MINUTES) return "night"
  const serviceDay = new Date(now.getTime() - 3 * 60 * 60 * 1000).getDay()
  return serviceDay === 5 || serviceDay === 6 ? "weekend" : "weekday"
}

/** When the night timetable gives way to the morning one (04:30), in minutes past midnight. */
export const NIGHT_UNTIL_MINUTES = 4 * 60 + 30

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
  const end = Math.max(a, b) + 1
  return roundedPathD(line.vertices.slice(start, end), line.offsets.slice(start, end))
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

/** The station whose marker is closest to `p` within `tolerance` map units, for tap selection. */
export const nearestStation = (model: RailMapModel, p: Point, tolerance: number): StationMark | undefined => {
  let best: { mark: StationMark; distance: number } | undefined
  for (const mark of model.marks) {
    const calling = mark.lanes.filter((l) => l.calls)
    const distance = segmentDistance(p, calling[0].point, calling[calling.length - 1].point)
    if (distance <= tolerance && (!best || distance < best.distance)) best = { mark, distance }
  }
  return best?.mark
}

/** Where the station sits on the map: the middle of its marker; undefined when no line calls there. */
export const stationPoint = (model: RailMapModel, stationId: string): Point | undefined =>
  model.marks.find((m) => m.stationId === stationId)?.centre

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
 * The name shown on the map: the app's own name for the station, less the city
 * inside a city frame ("Tel Aviv - HaShalom" → "HaShalom").
 */
export const mapStationName = (name: string, stationNameOnly: boolean): string => {
  // A slash may break a line ("North/University"), which needs a zero-width space after it.
  let text = name.replace(/\//g, "/\u200B").trim()
  if (stationNameOnly) {
    const parts = text.split(/\s+[-–]\s+/)
    if (parts.length > 1) text = parts.slice(1).join(" - ")
  }
  return text
}

/** The station ids a line runs through without calling: on its route but not in its corridor. */
export const throughStations = (lineId: RailLineId): string[] => {
  const line = RAIL_LINES.find((l) => l.id === lineId)
  if (!line) return []
  return routeNodes(ROUTES[lineId]).filter((id) => NODES[id]?.label && !line.stationIds.includes(id))
}

export type { MapNode }
