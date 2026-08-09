import { create } from "zustand"
import { RouteApi } from "@/services/api/route-api"
import { add, closestTo, differenceInMinutes } from "date-fns"
import { RouteItem } from "@/services/api"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"

export type StatusType = "idle" | "pending" | "done" | "error"
export type ResultType = "normal" | "different-date" | "different-hour" | "not-found"

/**
 * Thrown by `getRoutes` when no routes are found for the requested date (an expected,
 * app-handled outcome — the UI shows a "no trains" / "no internet" state). It is used
 * only to drive react-query's `onError`, so it is filtered out of Sentry reporting to
 * avoid flooding the dashboard with tens of thousands of non-actionable events.
 */
export class RoutesNotFoundError extends Error {
  constructor() {
    super("Not found")
    this.name = "RoutesNotFoundError"
    // Restore the prototype chain so `instanceof` holds after transpilation to older targets.
    Object.setPrototypeOf(this, RoutesNotFoundError.prototype)
  }
}

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

const initialTrainRoutesState: TrainRoutesState = {
  routes: [],
  resultType: "normal",
  status: "idle",
}

export const resetTrainRoutesStore = () => useTrainRoutesStore.setState(initialTrainRoutesState)

export const useTrainRoutesStore = create<TrainRoutesStore>((set, get) => ({
  ...initialTrainRoutesState,

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
    set({ status: "pending" })

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

        let resultType: ResultType = "normal"
        if (apiHitCount > 0) {
          // We found routes for a date different than the requested date.
          resultType = "different-date"
        } else {
          const closestDateToNow = closestTo(
            time,
            result.map((result) => result.departureTime),
          )
          if (closestDateToNow) {
            const difference = differenceInMinutes(closestDateToNow, time)
            if (Math.abs(difference) >= 90) {
              // We found routes for the selected day but not at the requested hour.
              resultType = "different-hour"
            }
          }
        }

        // Set resultType once, atomically with the results — flipping it through "normal"
        // mid-fetch remounts RouteListWarning and re-fires its alert on every background refetch.
        set({ routes: result, status: "done", resultType })

        return result
      } else {
        apiHitCount += 1
        requestDate = add(requestDate, { days: 1 }).getTime()
      }
    }
    // We couldn't find routes for the requested date.
    set({ resultType: "not-found", status: "done" })
    throw new RoutesNotFoundError()
  },
}))

// Routes and resultType are not persisted (transient state)
export function getTrainRoutesSnapshot() {
  return {}
}

export function hydrateTrainRoutesStore(_data: any) {
  // No persistent state to hydrate - routes are always fetched fresh
}
