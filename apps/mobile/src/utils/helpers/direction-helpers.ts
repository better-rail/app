import { stationsObject } from "@/data/stations"

/**
 * Whether the train heads north or south from the boarding station, judged by its last stop.
 * Platform bearings can't tell this: Be'er Sheva North points WNW for trains heading to Tel Aviv.
 */
export function getTrainHeading(boardingStation: string, routeStations: string[]): "N" | "S" | null {
  const idx = routeStations.indexOf(boardingStation)
  const from = stationsObject[boardingStation]
  const to = stationsObject[routeStations[routeStations.length - 1]]
  if (idx === -1 || idx === routeStations.length - 1 || !from || !to) return null
  return to.lat > from.lat ? "N" : "S"
}
