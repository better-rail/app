import { create } from "zustand"
import { head, last } from "lodash"
import type { RouteItem } from "@/services/api"
import { routeDistanceKm, routeStationIds } from "@/utils/helpers/station-distance"
import { MOCK_RIDE_PREFIX, mockRides } from "./mock-rides"

/** Fills the statistics screens with generated rides in development. They're never persisted. */
const MOCK_RIDE_HISTORY = true

/** A live ride the rider took, kept for the statistics screen */
export type RideRecord = {
  id: string
  originId: string
  destinationId: string
  /** Scheduled, in ms */
  departureTime: number
  arrivalTime: number
  trainNumbers: number[]
  /** Minutes late at the last known refresh */
  delay: number
  distanceKm: number
  /** Every station passed, boarding to alighting */
  stationIds: string[]
}

const MAX_RECORDS = 3000

export interface RideHistoryState {
  rides: RideRecord[]
  /** Picks the rider's nickname on the statistics screen; undefined until first shown */
  riderNameSeed: number | undefined
}

export interface RideHistoryActions {
  addRide: (rideId: string, route: RouteItem) => void
  /** Keeps the delay the rider actually experienced, once the live route has been refreshed */
  updateDelay: (rideId: string, delay: number) => void
  removeRide: (rideId: string) => void
  setRiderNameSeed: (seed: number) => void
}

export type RideHistoryStore = RideHistoryState & RideHistoryActions

const initialState: RideHistoryState = { rides: [], riderNameSeed: undefined }

export const resetRideHistoryStore = () => useRideHistoryStore.setState(initialState)

export function rideRecordFromRoute(rideId: string, route: RouteItem): RideRecord {
  return {
    id: rideId,
    originId: String(head(route.trains)?.originStationId),
    destinationId: String(last(route.trains)?.destinationStationId),
    departureTime: route.departureTime,
    arrivalTime: route.arrivalTime,
    trainNumbers: route.trains.map((train) => train.trainNumber),
    delay: last(route.trains)?.delay ?? route.delay ?? 0,
    distanceKm: routeDistanceKm(route),
    stationIds: routeStationIds(route).map(String),
  }
}

export const useRideHistoryStore = create<RideHistoryStore>((set, get) => ({
  ...initialState,

  addRide(rideId, route) {
    const rides = get().rides.filter((ride) => ride.id !== rideId)
    rides.push(rideRecordFromRoute(rideId, route))
    set({ rides: rides.slice(-MAX_RECORDS) })
  },

  updateDelay(rideId, delay) {
    const { rides } = get()
    const index = rides.findIndex((ride) => ride.id === rideId)
    if (index === -1 || rides[index].delay === delay) return
    const updated = [...rides]
    updated[index] = { ...rides[index], delay }
    set({ rides: updated })
  },

  removeRide(rideId) {
    set({ rides: get().rides.filter((ride) => ride.id !== rideId) })
  },

  setRiderNameSeed(seed) {
    set({ riderNameSeed: seed })
  },
}))

export function getRideHistorySnapshot(state: RideHistoryState) {
  return { rides: state.rides.filter((ride) => !ride.id.startsWith(MOCK_RIDE_PREFIX)), riderNameSeed: state.riderNameSeed }
}

export function hydrateRideHistoryStore(data: any) {
  const rides: RideRecord[] = Array.isArray(data?.rides) ? data.rides : []
  if (__DEV__ && MOCK_RIDE_HISTORY) rides.unshift(...mockRides())
  useRideHistoryStore.setState({
    rides,
    riderNameSeed: Number.isSafeInteger(data?.riderNameSeed) ? data.riderNameSeed : undefined,
  })
}
