/**
 * The stations each line runs through without calling, read off the Service
 * Status map's geometry. Writes apps/server/src/status/through-stations.ts, which
 * the service-status extraction uses to tell which lines a suspended stretch cuts:
 * an express line whose trains pass Netanya without stopping has no service either
 * when the track between Netanya and Tel Aviv is closed.
 *
 *     cd apps/server && bun run ../mobile/scripts/rail-map-trace/through-stations.ts
 *
 * The artwork draws every line as its own strand, and strands sharing a track run
 * side by side at one fixed spacing. So at each station dot the lines on that track
 * are the strands found by stepping outward from the dot, perpendicular to it, one
 * strand width at a time, as long as a strand running the same way sits at each
 * step; the first gap ends the bundle. Every line in the bundle without a dot of its
 * own there runs through the station. A line on a different track nearby is either
 * not parallel or past a gap, and is not picked up.
 */
import { writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { LINE_GEOMETRY } from "../../src/data/rail-map-layout"
import { RAIL_LINES, type RailLineId } from "../../../server/src/status/lines"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = join(HERE, "../../../server/src/status/through-stations.ts")
/** How far off an exact strand width a neighbouring strand may sit (map units). */
const STEP_TOLERANCE = 0.35
/** Strands more than this far off parallel are another track crossing, not a neighbour. */
const PARALLEL_DEG = 20
/** No bundle is wider than this (map units); keeps the search local. */
const BUNDLE_REACH = 20

type Point = [number, number]
type Line = { id: RailLineId; points: Point[]; stations: { id: string; index: number }[] }

const unit = (v: Point): Point => {
  const length = Math.hypot(v[0], v[1]) || 1
  return [v[0] / length, v[1] / length]
}

const lines: Line[] = RAIL_LINES.map((line) => {
  const geometry = LINE_GEOMETRY[line.id]
  const points: Point[] = []
  for (let i = 0; i < geometry.points.length; i += 2) points.push([geometry.points[i], geometry.points[i + 1]])
  return { id: line.id, points, stations: geometry.stations }
})

/** Every dot the artwork draws for a station: which line's strand it is on, where, and the strand's direction there. */
type Dot = { line: RailLineId; at: Point; dir: Point }
const dotsByStation = new Map<string, Dot[]>()
for (const line of lines) {
  for (const station of line.stations) {
    const before = line.points[Math.max(0, station.index - 1)]
    const after = line.points[Math.min(line.points.length - 1, station.index + 1)]
    const dots = dotsByStation.get(station.id) ?? []
    dots.push({ line: line.id, at: line.points[station.index], dir: unit([after[0] - before[0], after[1] - before[1]]) })
    dotsByStation.set(station.id, dots)
  }
}

/** The strand width: the median distance between a station's neighbouring dots. */
const strandWidth = (): number => {
  const gaps: number[] = []
  for (const dots of dotsByStation.values()) {
    for (const a of dots) {
      let nearest = Infinity
      for (const b of dots) {
        const d = Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1])
        if (d > 0.2) nearest = Math.min(nearest, d)
      }
      if (nearest < Infinity) gaps.push(nearest)
    }
  }
  gaps.sort((a, b) => a - b)
  return gaps[Math.floor(gaps.length / 2)]
}
const STRAND = strandWidth()

/** Where each line's strand crosses the perpendicular through `dot`, as a signed offset from it, parallel strands only. */
type Crossing = { line: RailLineId; offset: number; position: number }
const crossings = (dot: Dot): Crossing[] => {
  const normal: Point = [-dot.dir[1], dot.dir[0]]
  const cosLimit = Math.cos((PARALLEL_DEG * Math.PI) / 180)
  const out: Crossing[] = []
  for (const line of lines) {
    const first = line.stations[0].index
    const last = line.stations[line.stations.length - 1].index
    for (let i = first; i < last; i++) {
      const a = line.points[i]
      const b = line.points[i + 1]
      const dir = unit([b[0] - a[0], b[1] - a[1]])
      if (Math.abs(dir[0] * dot.dir[0] + dir[1] * dot.dir[1]) < cosLimit) continue
      // The segment crosses the perpendicular where its along-strand coordinate passes zero.
      const ua = (a[0] - dot.at[0]) * dot.dir[0] + (a[1] - dot.at[1]) * dot.dir[1]
      const ub = (b[0] - dot.at[0]) * dot.dir[0] + (b[1] - dot.at[1]) * dot.dir[1]
      if ((ua > 0 && ub > 0) || (ua < 0 && ub < 0)) continue
      const t = ua === ub ? 0 : ua / (ua - ub)
      const cross: Point = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
      const offset = (cross[0] - dot.at[0]) * normal[0] + (cross[1] - dot.at[1]) * normal[1]
      if (Math.abs(offset) <= BUNDLE_REACH) out.push({ line: line.id, offset, position: i + t })
    }
  }
  return out
}

/** The lines whose strands form one bundle with `dot`, with where along each the station lies. */
const bundleAt = (dot: Dot): Map<RailLineId, number> => {
  const found = new Map<RailLineId, number>()
  const all = crossings(dot)
  for (const x of all) if (Math.abs(x.offset) < STEP_TOLERANCE && !found.has(x.line)) found.set(x.line, x.position)
  for (const side of [1, -1]) {
    for (let expected = STRAND; ; expected += STRAND) {
      const step = all.filter((x) => Math.abs(x.offset * side - expected) < STEP_TOLERANCE)
      if (step.length === 0) break
      for (const x of step) if (!found.has(x.line)) found.set(x.line, x.position)
    }
  }
  return found
}

type Through = { stationId: string; after: string; position: number }
const throughByLine = new Map<RailLineId, Through[]>(lines.map((line) => [line.id, []]))
for (const [stationId, dots] of dotsByStation) {
  const calling = new Set(dots.map((dot) => dot.line))
  const onTrack = new Map<RailLineId, number>()
  for (const dot of dots) for (const [line, position] of bundleAt(dot)) if (!onTrack.has(line)) onTrack.set(line, position)
  for (const [lineId, position] of onTrack) {
    if (calling.has(lineId)) continue
    const line = lines.find((l) => l.id === lineId)!
    const after = [...line.stations].reverse().find((s) => s.index <= position)
    if (!after) continue
    throughByLine.get(lineId)!.push({ stationId, after: after.id, position })
  }
}

const rows = RAIL_LINES.map((line) => {
  const through = throughByLine.get(line.id)!.sort((a, b) => a.position - b.position)
  const entries = through.map((t) => `{ stationId: "${t.stationId}", after: "${t.after}" }`)
  return `  "${line.id}": [${entries.length ? `\n    ${entries.join(",\n    ")},\n  ` : ""}],`
})

writeFileSync(
  OUT,
  `/**
 * through-stations.ts — the stations each line runs through without calling, so a suspended
 * stretch is charged to every line whose trains use that track, not only to the lines that
 * call at its ends. Read off the Service Status map's geometry, where lines sharing a track
 * are drawn as neighbouring strands: a line without a dot at a station, whose strand runs in
 * that station's bundle, runs through it.
 *
 * Each entry names the station and the calling station it follows in the line's corridor
 * (\`after\`), so the full corridor can be rebuilt in order — see \`corridorOf\` in lines.ts.
 *
 * Generated by apps/mobile/scripts/rail-map-trace/through-stations.ts — regenerate rather than hand-edit.
 */
import type { RailLineId } from "./lines"

export type ThroughStation = { stationId: string; after: string }

export const THROUGH_STATIONS: Record<RailLineId, ThroughStation[]> = {
${rows.join("\n")}
}
`,
)
console.log(`strand width ${STRAND.toFixed(3)}; wrote ${OUT}`)
for (const line of RAIL_LINES) {
  const through = throughByLine.get(line.id)!
  if (through.length) console.log(`line ${line.id}: runs through ${through.map((t) => t.stationId).join(", ")}`)
}
