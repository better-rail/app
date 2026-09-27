import type { Train } from "@/services/api"
import { acrossTheIsland } from "@/data/island-platforms"

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

// The station the onward train starts its run from, where it usually waits at the platform before leaving
export function trainStartStation(train: Train): string | undefined {
  const firstStop = train.routeStations[0]
  return firstStop ? String(firstStop.stationId) : undefined
}

export type PlatformChange = "same" | "across"

// How far the rider walks between trains at each station, when it's no more than crossing the platform
export function easyPlatformChanges(firstTrain: Train, secondTrain: Train, stationIds: string[]): Record<string, PlatformChange> {
  const platformAt = (train: Train, stationId: string) =>
    train.routeStations.find((s) => String(s.stationId) === stationId)?.platform
  const changes: Record<string, PlatformChange> = {}
  for (const id of stationIds) {
    const off = platformAt(firstTrain, id)
    const on = platformAt(secondTrain, id)
    if (!off || !on) continue
    if (off === on) changes[id] = "same"
    else if (acrossTheIsland(id, off, on)) changes[id] = "across"
  }
  return changes
}
