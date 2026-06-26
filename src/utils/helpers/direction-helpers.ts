/**
 * Determines the train's heading direction at a station using OSM track geometry.
 *
 * For each station, track_bearings.json contains the actual track bearing(s) at
 * the platform from OSM data. At runtime, we pick the bearing that best matches
 * the direction of travel (toward the next station in the route).
 *
 * Usage:
 *   import { getTrainDirection } from "./direction-helpers";
 *   const dir = getTrainDirection("3700", ["400","300","8600","4900","4600","3700","3600","3500"]); // "N"
 */

import trackBearingsData from "../../data/directions/track_bearings.json"
import { stationsObject } from "../../data/stations"

export type Direction = "N" | "S" | "E" | "W"

interface TrackDir {
  bearing: number
  sampleLat: number
  sampleLon: number
}

interface StationTrackInfo {
  stationId: string
  directions: TrackDir[]
}

const trackMap = new Map<string, StationTrackInfo>((trackBearingsData as StationTrackInfo[]).map((t) => [t.stationId, t]))

/**
 * Manual bearing overrides for station-pairs where OSM connectivity is broken
 * (the A1 high-speed tunnel between Patei Modiin and Jerusalem).
 * Key: "origin:next" → platform bearing at origin.
 */
const BEARING_OVERRIDES: Record<string, number> = {
  // A1 high-speed line: OSM has connectivity gap at the tunnel
  "300:680": 281, // Patei Modiin → Jerusalem: west into tunnel
  "680:300": 283, // Jerusalem → Patei Modiin: west out of station
  // Modiin Center: track is N-S but Patei Modiin is WSW (nearly perpendicular)
  "400:300": 167, // Modiin Center → Patei Modiin: south along track
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const φ1 = toRad(lat1),
    φ2 = toRad(lat2),
    Δλ = toRad(lon2 - lon1)
  const x = Math.cos(φ2) * Math.sin(Δλ)
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((toDeg(Math.atan2(x, y)) % 360) + 360) % 360
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360)
  return d > 180 ? 360 - d : d
}

function quantize(bearing: number): Direction {
  const dirs: Direction[] = ["N", "E", "S", "W"]
  return dirs[Math.floor(((bearing + 45) % 360) / 90)]
}

function getStation(id: string) {
  const s = stationsObject[id]
  if (!s) throw new Error(`Unknown station: ${id}`)
  return s
}

/**
 * Get the train's heading direction at originStation.
 *
 * Strategy:
 * 1. Compute rough bearing from origin to next station (or from prev to origin for terminal)
 * 2. Pick the OSM track bearing at the platform that's closest to this rough bearing
 * 3. Use manual overrides for known OSM connectivity gaps (A1 tunnel)
 *
 * @param originStation - Israel Railways API station ID (e.g. "3700")
 * @param routeStations - Ordered array of all station IDs in the route
 * @returns Cardinal direction the train is heading: "N", "S", "E", or "W"
 */
export function getTrainDirection(originStation: string, routeStations: string[]): Direction {
  const idx = routeStations.indexOf(originStation)
  if (idx === -1) {
    throw new Error(`Station ${originStation} not found in route`)
  }

  const origin = getStation(originStation)

  // Determine rough direction of travel
  let roughBearing: number
  let refStationId: string
  if (idx + 1 < routeStations.length) {
    const next = getStation(routeStations[idx + 1])
    refStationId = routeStations[idx + 1]
    roughBearing = calculateBearing(origin.lat, origin.lon, next.lat, next.lon)
  } else if (idx - 1 >= 0) {
    const prev = getStation(routeStations[idx - 1])
    refStationId = routeStations[idx - 1]
    roughBearing = calculateBearing(prev.lat, prev.lon, origin.lat, origin.lon)
  } else {
    throw new Error("Route must have at least 2 stations")
  }

  // Check manual overrides
  const overrideKey = `${originStation}:${refStationId}`
  const override = BEARING_OVERRIDES[overrideKey]
  if (override != null) {
    return quantize(override)
  }

  // Pick the OSM track bearing closest to the rough bearing
  const track = trackMap.get(originStation)
  if (!track || track.directions.length === 0) {
    // Fallback: use rough bearing directly
    return quantize(roughBearing)
  }

  let bestBearing = track.directions[0].bearing
  let bestDiff = angleDiff(bestBearing, roughBearing)

  for (let i = 1; i < track.directions.length; i++) {
    const diff = angleDiff(track.directions[i].bearing, roughBearing)
    if (diff < bestDiff) {
      bestDiff = diff
      bestBearing = track.directions[i].bearing
    }
  }

  return quantize(bestBearing)
}
