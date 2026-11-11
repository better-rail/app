import { create } from "zustand"
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
}

const initialState: RecurringRidesState = { rides: [] }

export const useRecurringRidesStore = create<RecurringRidesState & RecurringRidesActions>((set) => ({
  ...initialState,

  save(ride) {
    set((state) => {
      const index = state.rides.findIndex((existing) => existing.id === ride.id)
      if (index === -1) return { rides: [...state.rides, ride].slice(0, MAX_RECURRING_RIDES) }
      return { rides: state.rides.map((existing) => (existing.id === ride.id ? ride : existing)) }
    })
  },

  setEnabled(id, enabled) {
    set((state) => ({ rides: state.rides.map((ride) => (ride.id === id ? { ...ride, enabled } : ride)) }))
  },

  remove(id) {
    set((state) => ({ rides: state.rides.filter((ride) => ride.id !== id) }))
  },
}))

/** The recurring ride for this route and departure time, if the rider saved one. */
export const findRecurringRide = (rides: RecurringRide[], originId: number, destinationId: number, departureTime: string) =>
  rides.find((ride) => ride.originId === originId && ride.destinationId === destinationId && ride.departureTime === departureTime)

export const getRecurringRidesSnapshot = (state: RecurringRidesState) => ({ rides: state.rides })

export const hydrateRecurringRidesStore = (data?: Partial<RecurringRidesState>) => {
  if (Array.isArray(data?.rides)) useRecurringRidesStore.setState({ rides: data.rides })
}

export const resetRecurringRidesStore = () => useRecurringRidesStore.setState(initialState)
