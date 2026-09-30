import type { Train } from "@/services/api"
import { acrossTheIsland } from "@/data/island-platforms"

const MIN_CONNECTION_MINUTES = 5
const MIN_CONNECTION_SAME_PLATFORM_MINUTES = 4
const DAY_MINUTES = 24 * 60

const minutesOfDay = (time?: string) => {
  const [hours, minutes] = (time ?? "").split(":").map(Number)
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : undefined
}

// Whether the second train leaves the station late enough to be caught off the first
function canConnectAt(firstTrain: Train, secondTrain: Train, stationId: number): boolean {
  const stopOf = (train: Train) => train.routeStations.find((s) => s.stationId === stationId)
  const [off, on] = [stopOf(firstTrain), stopOf(secondTrain)]
  const [offAt, onAt] = [minutesOfDay(off?.arrivalTime), minutesOfDay(on?.arrivalTime)]
  if (!off || !on || offAt === undefined || onAt === undefined) return true

  // Past midnight the clock wraps, so a gap over half a day means the second train left first
  const wait = (onAt - offAt + DAY_MINUTES) % DAY_MINUTES
  if (wait > DAY_MINUTES / 2) return false
  const stayingPut = off.platform === on.platform || acrossTheIsland(String(stationId), off.platform, on.platform)
  return wait >= (stayingPut ? MIN_CONNECTION_SAME_PLATFORM_MINUTES : MIN_CONNECTION_MINUTES)
}

// Stops both trains share between boarding and alighting where the change can be made, minus the current one
export function alternativeChangeStations(firstTrain: Train, secondTrain: Train): string[] {
  const firstRun = firstTrain.routeStations.map((s) => s.stationId)
  const secondRun = secondTrain.routeStations.map((s) => s.stationId)
  const boardAt = firstRun.indexOf(firstTrain.originStationId)
  const alightAt = secondRun.indexOf(secondTrain.destinationStationId)
  const afterBoarding = firstRun.slice(boardAt + 1)
  const beforeAlighting = new Set(secondRun.slice(0, alightAt === -1 ? undefined : alightAt))
  return afterBoarding
    .filter((id) => id !== firstTrain.destinationStationId && beforeAlighting.has(id))
    .filter((id) => canConnectAt(firstTrain, secondTrain, id))
    .map(String)
}

// The station the onward train starts its run from, where it usually waits at the platform before leaving
export function trainStartStation(train: Train): string | undefined {
  if (train.isCancelled) return undefined
  const firstStop = train.routeStations.find((s) => !s.cancelled)
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
