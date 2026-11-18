import type { Train } from "@/services/api"

/**
 * What the live positions say about a connecting train the late train may not make:
 * - "stillAtStation": its departure time has passed but it's still standing at the change station
 * - "left": it left the change station before the first train got there
 * - "unknown": nothing to add to the delay-based prediction
 */
export type ConnectionStatus = "stillAtStation" | "left" | "unknown"

// Position in the train's run, or -1 when the station isn't on it
const runIndex = (train: Train, stationId: number) => train.routeStations.findIndex((s) => s.stationId === stationId)

/** True while the train hasn't reached the station yet. Unknown positions count as false. */
const isBefore = (train: Train, stationId: number) => {
  const current = train.trainPosition?.currentLastStation
  if (!current) return false
  const currentIndex = runIndex(train, current)
  const stationIndex = runIndex(train, stationId)
  return currentIndex !== -1 && stationIndex !== -1 && currentIndex < stationIndex
}

export function connectionStatus(firstTrain: Train, secondTrain: Train, now: number): ConnectionStatus {
  const stationId = secondTrain.originStationId
  // Once the first train is at the station, the rider can see for themselves
  if (!isBefore(firstTrain, stationId)) return "unknown"

  const current = secondTrain.trainPosition?.currentLastStation
  if (!current) return "unknown"

  if (current === stationId) {
    const isStanding = secondTrain.trainPosition.nextStation === 0
    if (!isStanding) return "left"
    // Standing there before its departure time is just the timetable
    return now >= secondTrain.departureTime ? "stillAtStation" : "unknown"
  }

  const currentIndex = runIndex(secondTrain, current)
  const stationIndex = runIndex(secondTrain, stationId)
  if (currentIndex !== -1 && stationIndex !== -1 && currentIndex > stationIndex) return "left"
  return "unknown"
}
