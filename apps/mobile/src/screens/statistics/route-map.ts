import { stationsObject } from "@/data/stations"

export type MapPoint = { x: number; y: number }

/** A projection that fits the stations' coordinates into a box, keeping their real proportions */
export function fitProjection(stationIds: string[], width: number, height: number, padding: number) {
  const coords = stationIds.map((id) => stationsObject[id]).filter((station) => station !== undefined)
  if (coords.length === 0) return undefined

  // Longitude degrees shrink with latitude; Israel is near enough to one latitude to scale them once
  const lonScale = Math.cos((coords[0].lat * Math.PI) / 180)
  const xs = coords.map((station) => station.lon * lonScale)
  const ys = coords.map((station) => -station.lat)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const spanX = Math.max(...xs) - minX
  const spanY = Math.max(...ys) - minY
  const scale = Math.min((width - padding * 2) / (spanX || 1), (height - padding * 2) / (spanY || 1))
  const offsetX = (width - spanX * scale) / 2
  const offsetY = (height - spanY * scale) / 2

  return (lat: number, lon: number): MapPoint => ({
    x: offsetX + (lon * lonScale - minX) * scale,
    y: offsetY + (-lat - minY) * scale,
  })
}

export function projectStations(stationIds: string[], width: number, height: number, padding: number): MapPoint[] {
  const project = fitProjection(stationIds, width, height, padding)
  if (!project) return []
  return stationIds
    .map((id) => stationsObject[id])
    .filter((station) => station !== undefined)
    .map((station) => project(station.lat, station.lon))
}

/** Other stations that fall inside the box, for context around the route */
export function nearbyStations(stationIds: string[], width: number, height: number, padding: number): MapPoint[] {
  const project = fitProjection(stationIds, width, height, padding)
  if (!project) return []
  const onRoute = new Set(stationIds)
  return Object.entries(stationsObject)
    .filter(([id]) => !onRoute.has(id))
    .map(([, station]) => project(station.lat, station.lon))
    .filter((point) => point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height)
}

export function pathLength(points: MapPoint[]) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return total
}
