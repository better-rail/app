import { create } from "zustand"
import { RouteApi } from "@/services/api/route-api"
import type { RouteItem } from "@/services/api"
import { useSettingsStore } from "@/models/settings/settings"
import { searchRoutes, RoutesNotFoundError, type RouteSearchResult } from "./search-routes"

export { RoutesNotFoundError } from "./search-routes"
export type { ResultType, RouteSearchResult } from "./search-routes"

export type StatusType = "idle" | "pending" | "done" | "error"

export interface TrainRoutesState {
  routes: RouteItem[]
  status: StatusType
}

export interface TrainRoutesActions {
  saveRoutes: (routes: RouteItem[]) => void
  setStatus: (value: StatusType) => void
  getRoutes: (
    originId: string,
    destinationId: string,
    time: number,
    options?: { hideSlowTrains?: boolean; previousResult?: RouteSearchResult },
  ) => Promise<RouteSearchResult>
}

export type TrainRoutesStore = TrainRoutesState & TrainRoutesActions

const initialTrainRoutesState: TrainRoutesState = {
  routes: [],
  status: "idle",
}

export const resetTrainRoutesStore = () => useTrainRoutesStore.setState(initialTrainRoutesState)

export const useTrainRoutesStore = create<TrainRoutesStore>((set) => ({
  ...initialTrainRoutesState,

  saveRoutes(routes) {
    set({ routes })
  },

  setStatus(value) {
    set({ status: value })
  },

  async getRoutes(originId, destinationId, time, options = {}) {
    set({ status: "pending" })
    try {
      const result = await searchRoutes(
        new RouteApi(),
        originId,
        destinationId,
        time,
        options.hideSlowTrains ?? useSettingsStore.getState().hideSlowTrains,
        options.previousResult,
      )
      set({ routes: result.routes, status: "done" })
      return result
    } catch (error) {
      set({ status: error instanceof RoutesNotFoundError ? "done" : "error" })
      throw error
    }
  },
}))

// Search results are transient and belong to their query cache entry.
export function getTrainRoutesSnapshot() {
  return {}
}

export function hydrateTrainRoutesStore(_data: any) {
  // No persistent state to hydrate - routes are always fetched fresh
}
