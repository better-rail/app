/**
 * station-match.ts — map the canonical 3700-style Israel Railways station IDs
 * (server/src/data/rail-stations-geo.json, extracted from the app's station list
 * with lat/lon + Hebrew names) onto GTFS rail station nodes.
 *
 * Station numbers differ between the two systems, so the match is geographic
 * (Haversine nearest-neighbor) confirmed by Hebrew-name similarity. This is run
 * at every ingest to (re)build the station_map table, and by the build/verify
 * scripts to produce/check the committed station-mapping.json baseline.
 */
import type { GtfsStop } from "./parse"
import knownStationsJson from "../data/rail-stations-geo.json"

export type KnownStation = {
  id: string
  hebrew: string
  english: string
  lat: number
  lon: number
}

export const knownStations: KnownStation[] = (knownStationsJson as any[]).map((s) => ({
  id: s.id,
  hebrew: s.hebrew,
  english: s.english,
  lat: s.lat,
  lon: s.lon,
}))

export type StationMatch = {
  railId: number
  hebrew: string
  gtfsStationId: string
  gtfsStopName: string
  stopCode: string
  distanceM: number
  nameSim: number
  accepted: boolean
  flagged: boolean
  flagReason?: string
}

export type MatchResult = {
  matches: StationMatch[]
  /** rail_id -> accepted match (only accepted entries). */
  byRailId: Map<number, StationMatch>
  /** GTFS station-node stop_id -> rail_id (only accepted entries). */
  gtfsStationToRailId: Map<string, number>
  /** Known stations that didn't reach the acceptance threshold. */
  unmatched: StationMatch[]
  /** GTFS rail station nodes not claimed by any known station (possible new stations). */
  unclaimedNodes: { stopId: string; stopName: string; lat: number | null; lon: number | null }[]
}

const EARTH_RADIUS_M = 6_371_000

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Strip niqqud/cantillation, drop gershayim/quotes, collapse separators. */
export function normalizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[֑-ׇ]/g, "") // Hebrew points & cantillation
    .replace(/[׳״'"’‘`]/g, "") // geresh/gershayim/quotes
    .replace(/[-–—/,.()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

const bigrams = (s: string): Map<string, number> => {
  const grams = new Map<string, number>()
  const clean = s.replace(/\s/g, "")
  for (let i = 0; i < clean.length - 1; i++) {
    const g = clean.slice(i, i + 2)
    grams.set(g, (grams.get(g) ?? 0) + 1)
  }
  return grams
}

const diceCoefficient = (a: string, b: string): number => {
  if (a === b) return 1
  const ga = bigrams(a)
  const gb = bigrams(b)
  if (ga.size === 0 || gb.size === 0) return 0
  let overlap = 0
  for (const [g, count] of ga) {
    const other = gb.get(g)
    if (other) overlap += Math.min(count, other)
  }
  const total = [...ga.values()].reduce((x, y) => x + y, 0) + [...gb.values()].reduce((x, y) => x + y, 0)
  return (2 * overlap) / total
}

const tokenSetRatio = (a: string, b: string): number => {
  const ta = new Set(a.split(" ").filter(Boolean))
  const tb = new Set(b.split(" ").filter(Boolean))
  if (ta.size === 0 || tb.size === 0) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / new Set([...ta, ...tb]).size
}

/** The station's primary name — the part before any "(...)" or "/..." qualifier. */
const primaryName = (name: string): string => name.split(/[(/]/)[0]

const simOf = (na: string, nb: string): number => {
  if (!na || !nb) return 0
  return Math.max(diceCoefficient(na, nb), tokenSetRatio(na, nb))
}

/**
 * Similarity in [0,1]. Compares both the full normalized names and the primary
 * names (stripped of "(...)"/"/..." qualifiers) and takes the best — so e.g.
 * "מרכזית המפרץ (לב המפרץ)" matches the GTFS "מרכזית המפרץ/קו החוף".
 */
export function nameSimilarity(a: string, b: string): number {
  const full = simOf(normalizeName(a), normalizeName(b))
  const primary = simOf(normalizeName(primaryName(a)), normalizeName(primaryName(b)))
  return Math.max(full, primary)
}

const isAccepted = (distanceM: number, nameSim: number): boolean =>
  distanceM < 40 || (distanceM < 150 && nameSim >= 0.6) || (nameSim >= 0.9 && distanceM < 1000)

/**
 * Match every known rail station to its nearest name-consistent GTFS station node.
 * @param stationNodes GTFS station nodes (RailFeed.stationNodes values).
 */
export function matchStations(stationNodes: GtfsStop[], known: KnownStation[] = knownStations): MatchResult {
  const knownWithGeo = known.filter((k) => typeof k.lat === "number" && typeof k.lon === "number")
  const nodes = stationNodes.filter((n) => n.lat !== null && n.lon !== null)

  // Match per GTFS node -> known station (not the reverse), because a single
  // physical station can be split into several GTFS nodes (e.g. a separate node
  // per line/platform, like HaMifratz's main + coast-line nodes). One known
  // station therefore owns one-or-more nodes; orphaned nodes are genuinely new.
  const matches: StationMatch[] = [] // one entry per node
  const byRailId = new Map<number, StationMatch>()
  const gtfsStationToRailId = new Map<string, number>()
  const claimedRailIds = new Set<number>()
  const unclaimedNodes: MatchResult["unclaimedNodes"] = []

  for (const node of nodes) {
    const candidates = knownWithGeo
      .map((k) => ({
        k,
        dist: haversineMeters(k.lat, k.lon, node.lat as number, node.lon as number),
        sim: nameSimilarity(k.hebrew, node.stopName),
      }))
      .sort((a, b) => a.dist - b.dist)

    const geoWinner = candidates[0]
    const nameWinner = candidates.reduce((best, c) => (c.sim > best.sim ? c : best), candidates[0])

    let chosen = geoWinner
    let accepted = geoWinner ? isAccepted(geoWinner.dist, geoWinner.sim) : false

    // Geo failed but a strong name match sits within 1km (a far secondary node).
    if (!accepted && nameWinner && nameWinner.sim >= 0.9 && nameWinner.dist < 1000) {
      chosen = nameWinner
      accepted = true
    }

    let flagged = false
    let flagReason: string | undefined
    if (accepted && chosen) {
      const runnerUp = candidates.find((c) => c.k.id !== chosen.k.id)
      if (runnerUp && Math.abs(runnerUp.dist - chosen.dist) < 80 && runnerUp.sim >= chosen.sim) {
        flagged = true
        flagReason = "two known stations within 80m"
      }
    }

    const match: StationMatch = {
      railId: accepted && chosen ? Number(chosen.k.id) : 0,
      hebrew: accepted && chosen ? chosen.k.hebrew : "",
      gtfsStationId: node.stopId,
      gtfsStopName: node.stopName,
      stopCode: node.stopCode,
      distanceM: chosen ? Math.round(chosen.dist) : Infinity,
      nameSim: chosen ? Number(chosen.sim.toFixed(3)) : 0,
      accepted,
      flagged,
      flagReason,
    }
    matches.push(match)

    if (accepted && chosen) {
      gtfsStationToRailId.set(node.stopId, match.railId)
      claimedRailIds.add(match.railId)
      if (!byRailId.has(match.railId)) byRailId.set(match.railId, match)
    } else {
      unclaimedNodes.push({ stopId: node.stopId, stopName: node.stopName, lat: node.lat, lon: node.lon })
    }
  }

  // Known stations with no node in this feed (no service) — informational only.
  const unmatched: StationMatch[] = known
    .filter((k) => !claimedRailIds.has(Number(k.id)))
    .map((k) => ({
      railId: Number(k.id),
      hebrew: k.hebrew,
      gtfsStationId: "",
      gtfsStopName: "",
      stopCode: "",
      distanceM: Infinity,
      nameSim: 0,
      accepted: false,
      flagged: false,
    }))

  return { matches, byRailId, gtfsStationToRailId, unmatched, unclaimedNodes }
}
