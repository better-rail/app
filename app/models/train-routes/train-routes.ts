import { create } from "zustand"
import { RouteApi } from "../../services/api/route-api"
import { add, closestTo, differenceInMinutes } from "date-fns"
import { RouteItem } from "../../services/api"
import { formatDateForAPI } from "../../utils/helpers/date-helpers"

export type StatusType = "idle" | "pending" | "done" | "error"
export type ResultType = "normal" | "different-date" | "different-hour" | "not-found"

export interface TrainRoutesState {
  routes: RouteItem[]
  resultType: ResultType
  status: StatusType
}

export interface TrainRoutesActions {
  saveRoutes: (routes: RouteItem[]) => void
  updateResultType: (type: ResultType) => void
  setStatus: (value: StatusType) => void
  getRoutes: (originId: string, destinationId: string, time: number) => Promise<RouteItem[]>
}

export type TrainRoutesStore = TrainRoutesState & TrainRoutesActions

export const useTrainRoutesStore = create<TrainRoutesStore>((set, get) => ({
  routes: [],
  resultType: "normal",
  status: "idle",

  saveRoutes(routes) {
    set({ routes })
  },

  updateResultType(type) {
    if (get().resultType === type) return
    set({ resultType: type })
  },

  setStatus(value) {
    set({ status: value })
  },

  async getRoutes(originId, destinationId, time) {
    set({ status: "pending", resultType: "normal" })

    const routeApi = new RouteApi()
    let foundRoutes = false
    let apiHitCount = 0
    let requestDate = time

    // If no routes are found, try to fetch results for the upcoming 3 days.
    while (!foundRoutes && apiHitCount < 4) {
      // Format times for Israel Rail API
      const [date, hour] = formatDateForAPI(requestDate)

      const result = await routeApi.getRoutes(originId, destinationId, date, hour)

      if (result.length > 0) {
        foundRoutes = true
        set({ routes: result, status: "done" })

        if (apiHitCount > 0) {
          // We found routes for a date different than the requested date.
          set({ resultType: "different-date" })
        } else {
          const closestDateToNow = closestTo(
            time,
            result.map((result) => result.departureTime),
          )
          const difference = differenceInMinutes(closestDateToNow, time)
          if (Math.abs(difference) >= 90) {
            // We found routes for the selected day but not at the requested hour.
            set({ resultType: "different-hour" })
          }
        }

        return result
      } else {
        apiHitCount += 1
        requestDate = add(requestDate, { days: 1 }).getTime()
      }
    }
    // We couldn't find routes for the requested date.
    set({ resultType: "not-found", status: "done" })
    throw new Error("Not found")
  },
}))

// Routes and resultType are not persisted (transient state)
export function getTrainRoutesSnapshot() {
  return {}
}

export function hydrateTrainRoutesStore(_data: any) {
  // No persistent state to hydrate - routes are always fetched fresh
}
