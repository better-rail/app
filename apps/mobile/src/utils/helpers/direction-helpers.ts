import { stationsObject } from "@/data/stations"

/**
 * Whether the train runs north or south, judged by its whole route rather than the boarding stop:
 * platform bearings (Be'er Sheva North points WNW) and short legs (Akko → Karmiel runs east) both mislead.
 */
export function getTrainHeading(routeStations: string[]): "N" | "S" | null {
  const from = stationsObject[routeStations[0]]
  const to = stationsObject[routeStations[routeStations.length - 1]]
  if (!from || !to || from === to) return null
  return to.lat > from.lat ? "N" : "S"
}
