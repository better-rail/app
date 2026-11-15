import { format } from "date-fns"
import { create } from "zustand"
import { israelNow } from "@/utils/helpers/date-helpers"
import type { RecurringRide } from "@/services/api/device-api"

export type { RecurringRide }

/** The most rides the server keeps per device (`MAX_RECURRING_RIDES`). */
export const MAX_RECURRING_RIDES = 10

export interface RecurringRidesState {
  rides: RecurringRide[]
}

export interface RecurringRidesActions {
  /** Adds the ride, or replaces the one with its id. */
  save: (ride: RecurringRide) => void
  setEnabled: (id: string, enabled: boolean) => void
  remove: (id: string) => void
  /** Drops one-time rides whose train left. */
  pruneExpired: () => void
}

const initialState: RecurringRidesState = { rides: [] }

export const useRecurringRidesStore = create<RecurringRidesState & RecurringRidesActions>((set) => ({
  ...initialState,

  save(ride) {
    set((state) => {
      // A one-time ride whose train left doesn't hold a place against the limit
      const rides = state.rides.filter((existing) => !isPastOneTimeRide(existing))
      const index = rides.findIndex((existing) => existing.id === ride.id)
      if (index === -1) return { rides: [...rides, ride].slice(0, MAX_RECURRING_RIDES) }
      return { rides: rides.map((existing) => (existing.id === ride.id ? ride : existing)) }
    })
  },

  setEnabled(id, enabled) {
    set((state) => ({ rides: state.rides.map((ride) => (ride.id === id ? { ...ride, enabled } : ride)) }))
  },

  remove(id) {
    set((state) => ({ rides: state.rides.filter((ride) => ride.id !== id) }))
  },

  pruneExpired() {
    set((state) => {
      const rides = state.rides.filter((ride) => !isPastOneTimeRide(ride))
      // Unchanged rides keep their identity, so nothing re-syncs
      return rides.length === state.rides.length ? state : { rides }
    })
  },
}))

/** A route, via station and departure time: what a weekly ride and a one-time ride can share */
export type Trip = Pick<RecurringRide, "originId" | "destinationId" | "viaStationId" | "departureTime">

const isTrip = (ride: RecurringRide, trip: Trip) =>
  ride.originId === trip.originId &&
  ride.destinationId === trip.destinationId &&
  ride.viaStationId === trip.viaStationId &&
  ride.departureTime === trip.departureTime

/** The saved ride a save for `trip` replaces: the one-time ride on `date`, or without a date, the weekly ride. */
export const rideToSaveOver = (rides: RecurringRide[], trip: Trip, date?: string) =>
  rides.find((ride) => isTrip(ride, trip) && (date ? ride.date === date : !ride.date))

/** The saved ride for this trip's train on `date`: its one-time ride if there is one, else the weekly ride. */
export const findRecurringRide = (rides: RecurringRide[], trip: Trip, date?: string) =>
  (date && rideToSaveOver(rides, trip, date)) || rideToSaveOver(rides, trip)

/** Whether a one-time ride's train already left (Israel's clock, `now` as `israelNow` gives it). */
export const isPastOneTimeRide = (ride: RecurringRide, now = israelNow()) =>
  Boolean(ride.date) && `${ride.date}T${ride.departureTime}` <= format(now, "yyyy-MM-dd'T'HH:mm")

export const getRecurringRidesSnapshot = (state: RecurringRidesState) => ({ rides: state.rides })

export const hydrateRecurringRidesStore = (data?: Partial<RecurringRidesState>) => {
  // A one-time ride is done once its train left
  if (Array.isArray(data?.rides))
    useRecurringRidesStore.setState({ rides: data.rides.filter((ride) => !isPastOneTimeRide(ride)) })
}

export const resetRecurringRidesStore = () => useRecurringRidesStore.setState(initialState)
