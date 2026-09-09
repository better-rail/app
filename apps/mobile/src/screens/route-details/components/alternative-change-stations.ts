import type { Train } from "@/services/api"

// Stops both trains share between boarding and alighting, minus the current change
export function alternativeChangeStations(firstTrain: Train, secondTrain: Train): string[] {
  const firstRun = firstTrain.routeStations.map((s) => s.stationId)
  const secondRun = secondTrain.routeStations.map((s) => s.stationId)
  const boardAt = firstRun.indexOf(firstTrain.originStationId)
  const alightAt = secondRun.indexOf(secondTrain.destinationStationId)
  const afterBoarding = firstRun.slice(boardAt + 1)
  const beforeAlighting = new Set(secondRun.slice(0, alightAt === -1 ? undefined : alightAt))
  return afterBoarding.filter((id) => id !== firstTrain.destinationStationId && beforeAlighting.has(id)).map(String)
}
