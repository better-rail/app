import { stationsObject } from "@/data/stations"
import type { RouteItem } from "@/services/api"

const EARTH_RADIUS_KM = 6371

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/** Straight-line distance between consecutive stations, so stops along the way follow the track's bends */
export function stationsPathKm(stationIds: (string | number)[]) {
  let total = 0
  for (let i = 1; i < stationIds.length; i++) {
    const from = stationsObject[String(stationIds[i - 1])]
    const to = stationsObject[String(stationIds[i])]
    if (!from || !to) continue
    total += haversineKm(from.lat, from.lon, to.lat, to.lon)
  }
  return total
}

/** Every station a route passes through, boarding to alighting, including stops and changes */
export function routeStationIds(route: RouteItem) {
  const ids: number[] = []
  for (const train of route.trains) {
    ids.push(train.originStationId, ...train.stopStations.map((stop) => stop.stationId), train.destinationStationId)
  }
  return ids.filter((id, index) => index === 0 || id !== ids[index - 1])
}

export function routeDistanceKm(route: RouteItem) {
  return stationsPathKm(routeStationIds(route))
}
