import { addDays, closestTo, differenceInMinutes } from "date-fns"
import type { RouteItem } from "@/services/api"
import type { RouteApi } from "@/services/api/route-api"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"

export type ResultType = "normal" | "different-date" | "different-hour"

export interface RouteSearchResult {
  routes: RouteItem[]
  requestedTime: number
  // The timetable's service day can also include departures before 02:00 the following day.
  resolvedTime: number
  resultType: ResultType
}

/** An empty timetable is an expected outcome; request failures must remain errors. */
export class RoutesNotFoundError extends Error {
  constructor() {
    super("Not found")
    this.name = "RoutesNotFoundError"
    Object.setPrototypeOf(this, RoutesNotFoundError.prototype)
  }
}

export async function searchRoutes(
  api: Pick<RouteApi, "getRoutes">,
  originId: string,
  destinationId: string,
  requestedTime: number,
  hideSlowTrains: boolean,
): Promise<RouteSearchResult> {
  // Recheck the requested day on every refresh in case its timetable has recovered.
  for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
    const resolvedTime = addDays(requestedTime, dayOffset).getTime()
    const [date, hour] = formatDateForAPI(resolvedTime)
    const routes = await api.getRoutes(originId, destinationId, date, hour, { hideSlowTrains })
    if (routes.length === 0) continue

    let resultType: ResultType = "normal"
    if (dayOffset > 0) {
      resultType = "different-date"
    } else {
      const closestDeparture = closestTo(
        requestedTime,
        routes.map((route) => route.departureTime),
      )
      if (closestDeparture && Math.abs(differenceInMinutes(closestDeparture, requestedTime)) >= 90) {
        resultType = "different-hour"
      }
    }

    return { routes, requestedTime, resolvedTime, resultType }
  }

  throw new RoutesNotFoundError()
}
