/**
 * Pre-computes track bearings at each station using OSM railway geometry.
 *
 * For each station:
 * 1. Finds ALL main-line track ways within 100m
 * 2. For each way, walks connected tracks in both directions for ~15km
 * 3. Stores all possible departure directions with sample points
 *
 * At runtime, getTrainDirection picks the bearing closest to the
 * station-to-station rough bearing — handling junctions correctly.
 *
 * Run: bun scripts/build_track_bearings.ts
 * Output: track_bearings.json
 */

import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { stationsObject } from "../app/data/stations"

const DATA_DIR = join(__dirname, "..", "app", "data", "directions")

interface OsmNode {
  lat: number
  lon: number
}
interface OsmWay {
  type: "way"
  id: number
  geometry: OsmNode[]
  tags?: Record<string, string>
}
interface OsmData {
  elements: OsmWay[]
}
interface Station {
  id: string
  hebrew: string
  english: string
  lat: number
  lon: number
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calcBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2),
    Δλ = toRad(lon2 - lon1)
  const x = Math.cos(φ2) * Math.sin(Δλ)
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((toDeg(Math.atan2(x, y)) % 360) + 360) % 360
}

// ---- Load data ----
const osmData: OsmData = JSON.parse(readFileSync(join(DATA_DIR, "osm_rails.json"), "utf-8"))
const stations: Station[] = Object.values(stationsObject) as Station[]

// ---- Build way connectivity graph ----
const nodeKey = (n: OsmNode) => `${n.lat.toFixed(7)},${n.lon.toFixed(7)}`

interface WayEnd {
  wayId: number
  endIdx: number
}
const endpointMap = new Map<string, WayEnd[]>()
const wayMap = new Map<number, OsmWay>()

for (const way of osmData.elements) {
  if (!way.geometry || way.geometry.length < 2) continue
  wayMap.set(way.id, way)
  for (const idx of [0, way.geometry.length - 1]) {
    const key = nodeKey(way.geometry[idx])
    if (!endpointMap.has(key)) endpointMap.set(key, [])
    endpointMap.get(key)!.push({ wayId: way.id, endIdx: idx === 0 ? 0 : -1 })
  }
}

function walkConnectedTrack(
  startWayId: number,
  startNodeIdx: number,
  direction: 1 | -1,
  maxDist: number,
): { path: OsmNode[]; bearing: number } | null {
  const path: OsmNode[] = []
  const visitedWays = new Set<number>()
  let wayId = startWayId
  let nodeIdx = startNodeIdx
  let dir = direction
  let totalDist = 0

  const startWay = wayMap.get(startWayId)!
  const nextI = startNodeIdx + direction
  if (nextI < 0 || nextI >= startWay.geometry.length) return null

  // Bearing at the start
  const brg = calcBearing(
    startWay.geometry[startNodeIdx].lat,
    startWay.geometry[startNodeIdx].lon,
    startWay.geometry[nextI].lat,
    startWay.geometry[nextI].lon,
  )

  while (totalDist < maxDist) {
    const way = wayMap.get(wayId)
    if (!way) break
    visitedWays.add(wayId)

    while (totalDist < maxDist) {
      const nextIdx = nodeIdx + dir
      if (nextIdx < 0 || nextIdx >= way.geometry.length) break
      const cur = way.geometry[nodeIdx]
      const nxt = way.geometry[nextIdx]
      totalDist += haversine(cur.lat, cur.lon, nxt.lat, nxt.lon)
      path.push(nxt)
      nodeIdx = nextIdx
    }

    if (totalDist >= maxDist) break

    // Find best connected way (straightest continuation)
    const endNode = way.geometry[nodeIdx]
    const key = nodeKey(endNode)
    const connections = endpointMap.get(key)
    if (!connections) break

    const prevNode =
      nodeIdx - dir >= 0 && nodeIdx - dir < way.geometry.length ? way.geometry[nodeIdx - dir] : way.geometry[nodeIdx]
    const currentBearing = calcBearing(prevNode.lat, prevNode.lon, endNode.lat, endNode.lon)

    let bestConn: { wayId: number; nodeIdx: number; dir: 1 | -1 } | null = null
    let bestAngleDiff = Infinity

    for (const conn of connections) {
      if (conn.wayId === wayId || visitedWays.has(conn.wayId)) continue
      const nextWay = wayMap.get(conn.wayId)
      if (!nextWay || nextWay.geometry.length < 2) continue
      // Skip crossover and yard service tracks
      const svc = nextWay.tags?.service
      if (svc === "crossover" || svc === "yard" || svc === "siding") continue

      const nextNodeIdx = conn.endIdx === 0 ? 0 : nextWay.geometry.length - 1
      const nextDir: 1 | -1 = conn.endIdx === 0 ? 1 : -1
      const firstStep = nextNodeIdx + nextDir
      if (firstStep < 0 || firstStep >= nextWay.geometry.length) continue

      const candidateBearing = calcBearing(
        nextWay.geometry[nextNodeIdx].lat,
        nextWay.geometry[nextNodeIdx].lon,
        nextWay.geometry[firstStep].lat,
        nextWay.geometry[firstStep].lon,
      )

      let diff = Math.abs((((candidateBearing - currentBearing) % 360) + 360) % 360)
      if (diff > 180) diff = 360 - diff

      if (diff < bestAngleDiff) {
        bestAngleDiff = diff
        bestConn = { wayId: conn.wayId, nodeIdx: nextNodeIdx, dir: nextDir }
      }
    }

    if (!bestConn) break
    wayId = bestConn.wayId
    nodeIdx = bestConn.nodeIdx
    dir = bestConn.dir
  }

  return { path, bearing: brg }
}

// ---- Build segment index ----
interface Segment {
  wayId: number
  segIdx: number
  a: OsmNode
  b: OsmNode
}
const segments: Segment[] = []
for (const way of osmData.elements) {
  if (!way.geometry || way.geometry.length < 2) continue
  // Skip service tracks for segment matching too
  const svc = way.tags?.service
  if (svc === "crossover" || svc === "yard" || svc === "siding") continue
  for (let i = 0; i < way.geometry.length - 1; i++) {
    segments.push({ wayId: way.id, segIdx: i, a: way.geometry[i], b: way.geometry[i + 1] })
  }
}
console.log(`Loaded ${segments.length} main-track segments from ${osmData.elements.length} ways`)

// ---- Process each station ----
export interface TrackDir {
  bearing: number
  sampleLat: number
  sampleLon: number
}

export interface StationTrackInfo {
  stationId: string
  nameEn: string
  nameHe: string
  trackDistanceM: number
  /** All possible departure directions from this station */
  directions: TrackDir[]
}

const SEARCH_RADIUS = 0.001 // ~100m in degrees
const SAMPLE_DIST = 15000 // 15km walk along connected track — enough to disambiguate long tunnels
const results: StationTrackInfo[] = []

for (const station of stations) {
  if (station.lat == null || station.lon == null) continue

  // Find ALL main-track ways within ~100m of the station
  const nearbyHits = new Map<number, { dist: number; segIdx: number }>() // wayId → closest segment

  for (const seg of segments) {
    const minLat = Math.min(seg.a.lat, seg.b.lat) - SEARCH_RADIUS
    const maxLat = Math.max(seg.a.lat, seg.b.lat) + SEARCH_RADIUS
    const minLon = Math.min(seg.a.lon, seg.b.lon) - SEARCH_RADIUS
    const maxLon = Math.max(seg.a.lon, seg.b.lon) + SEARCH_RADIUS
    if (station.lat < minLat || station.lat > maxLat) continue
    if (station.lon < minLon || station.lon > maxLon) continue

    const dx = seg.b.lat - seg.a.lat
    const dy = seg.b.lon - seg.a.lon
    const lenSq = dx * dx + dy * dy
    const t =
      lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((station.lat - seg.a.lat) * dx + (station.lon - seg.a.lon) * dy) / lenSq))
    const projLat = seg.a.lat + t * dx
    const projLon = seg.a.lon + t * dy
    const dist = haversine(station.lat, station.lon, projLat, projLon)

    if (dist > 100) continue // 100m max

    const existing = nearbyHits.get(seg.wayId)
    if (!existing || dist < existing.dist) {
      nearbyHits.set(seg.wayId, { dist, segIdx: seg.segIdx })
    }
  }

  if (nearbyHits.size === 0) {
    // Fallback: find single closest way with larger radius
    let bestDist = Infinity,
      bestWayId = -1,
      bestSegIdx = -1
    for (const seg of segments) {
      if (Math.abs(seg.a.lat - station.lat) > 0.02) continue
      if (Math.abs(seg.a.lon - station.lon) > 0.02) continue
      const dx = seg.b.lat - seg.a.lat,
        dy = seg.b.lon - seg.a.lon
      const lenSq = dx * dx + dy * dy
      const t =
        lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((station.lat - seg.a.lat) * dx + (station.lon - seg.a.lon) * dy) / lenSq))
      const dist = haversine(station.lat, station.lon, seg.a.lat + t * dx, seg.a.lon + t * dy)
      if (dist < bestDist) {
        bestDist = dist
        bestWayId = seg.wayId
        bestSegIdx = seg.segIdx
      }
    }
    if (bestWayId !== -1) nearbyHits.set(bestWayId, { dist: bestDist, segIdx: bestSegIdx })
  }

  const directions: TrackDir[] = []
  let closestDist = Infinity

  // For each nearby way, walk in both directions
  for (const [wayId, { dist, segIdx }] of nearbyHits) {
    if (dist < closestDist) closestDist = dist

    for (const walkDir of [1, -1] as const) {
      const result = walkConnectedTrack(wayId, segIdx, walkDir, SAMPLE_DIST)
      if (!result || result.path.length === 0) continue

      const sample = result.path[result.path.length - 1]

      // Deduplicate: skip if sample point is within 1km of an existing one
      // (same physical route, just a parallel track)
      const isDuplicate = directions.some((d) => haversine(d.sampleLat, d.sampleLon, sample.lat, sample.lon) < 1000)
      if (isDuplicate) continue

      directions.push({
        bearing: Math.round(result.bearing * 100) / 100,
        sampleLat: sample.lat,
        sampleLon: sample.lon,
      })
    }
  }

  // Ensure we have both sides of the track axis.
  // Check if all directions are on the same "side" (within 90° of each other).
  // If so, add the reverse of the first one.
  if (directions.length > 0) {
    const ref = directions[0].bearing
    const allSameSide = directions.every((d) => {
      let diff = Math.abs((((d.bearing - ref) % 360) + 360) % 360)
      if (diff > 180) diff = 360 - diff
      return diff < 90
    })
    if (allSameSide) {
      directions.push({
        bearing: Math.round(((ref + 180) % 360) * 100) / 100,
        sampleLat: station.lat,
        sampleLon: station.lon,
      })
    }
  }

  results.push({
    stationId: station.id,
    nameEn: station.english,
    nameHe: station.hebrew,
    trackDistanceM: Math.round(closestDist),
    directions,
  })

  const dirStr = directions.map((d) => `${d.bearing.toFixed(1)}°`).join(", ")
  console.log(
    `${station.id.padStart(5)} ${station.english.padEnd(40)} ${directions.length} dirs [${dirStr}]  (${Math.round(
      closestDist,
    )}m)`,
  )
}

writeFileSync(join(DATA_DIR, "track_bearings.json"), `${JSON.stringify(results, null, 2)}\n`)
console.log(`\nWrote ${results.length} stations to ${join(DATA_DIR, "track_bearings.json")}`)
