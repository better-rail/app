/**
 * day-availability.ts — which weekdays have a train at a recurring ride's departure time.
 *
 * The server starts the train leaving within 5 minutes of the saved time (findTravel in apps/api), so a weekday
 * without one would never start. The sheet disables those days. One week can be a holiday, so a day counts as
 * without a train only when the next two of it both have none.
 */
import { useQuery } from "react-query"
import type { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { formatDateForAPI, timezoneCorrection } from "@/utils/helpers/date-helpers"
import { WEEKDAYS } from "./recurring-ride-format"

const routeApi = new RouteApi()

// Same tolerance the server uses to match the ride to a train
const DEPARTURE_TOLERANCE_MS = 5 * 60 * 1000
// Search from a little before the departure, so a train a few minutes early is in the results
const SEARCH_LEAD_MS = 30 * 60 * 1000

/** Whether one of the routes leaves within the tolerance of the departure (ms, Israel's wall clock) */
export const hasTrainAround = (routes: Pick<RouteItem, "departureTime">[], departureAt: number) =>
  routes.some((route) => Math.abs(route.departureTime - departureAt) <= DEPARTURE_TOLERANCE_MS)

/** The ride's departure on each weekday (index = weekday), from `now` on, `weeksAhead` weeks later */
export const weekdayDepartures = (now: Date, departureTime: string, weeksAhead = 0) => {
  const [hours, minutes] = departureTime.split(":").map(Number)
  return WEEKDAYS.map((day) => {
    const date = new Date(now)
    date.setDate(now.getDate() + ((day - now.getDay() + 7) % 7) + weeksAhead * 7)
    date.setHours(hours, minutes, 0, 0)
    return date.getTime()
  })
}

const hasTrain = async (originId: string, destinationId: string, departureAt: number) => {
  const [date] = formatDateForAPI(departureAt)
  const [searchDate, searchHour] = formatDateForAPI(departureAt - SEARCH_LEAD_MS)
  // Past midnight the search starts at the day's beginning instead
  const hour = searchDate === date ? searchHour : "00:00"
  const routes = await routeApi.getRoutes(originId, destinationId, date, hour)
  return hasTrainAround(routes, departureAt)
}

/**
 * For each weekday: true when it has a train at the departure time, false when it doesn't,
 * undefined while loading or when the timetable couldn't be read (the day stays available).
 */
export function useDayAvailability(originId: string | undefined, destinationId: string | undefined, departureTime: string) {
  const { data } = useQuery(
    ["recurringRideDays", originId, destinationId, departureTime],
    async () => {
      const now = timezoneCorrection(new Date())
      const thisWeek = weekdayDepartures(now, departureTime)
      const nextWeek = weekdayDepartures(now, departureTime, 1)

      return Promise.all(
        WEEKDAYS.map(async (day) => {
          try {
            if (await hasTrain(originId!, destinationId!, thisWeek[day])) return true
            return await hasTrain(originId!, destinationId!, nextWeek[day])
          } catch {
            return undefined
          }
        }),
      )
    },
    { enabled: Boolean(originId && destinationId), staleTime: 60 * 60 * 1000, retry: 1 },
  )

  return data ?? []
}
