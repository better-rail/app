import { createServerFn } from "@tanstack/react-start"
import { getRequestHeader } from "@tanstack/react-start/server"
import { getStationById } from "@/data/stations"
import { isValidClock, isValidDateKey, naiveFromParts, addDays, dateKey, minutesBetween } from "@/lib/time"
import { formatTravels, closestRouteIndex } from "./route-format"
import type { ApiSearchResult, ResultType, RoutesResult, RoutesSearch } from "./types"

const API_BASE = process.env.RAIL_API_BASE ?? "https://api.better-rail.co.il/api/v1/rail-api"
const SEARCH_PATH = "/rjpa/api/v1/timetable/searchTrainForMobile"
const REQUEST_TIMEOUT_MS = 20_000
/** How many extra days to look ahead when the requested day has no service (weekends, holidays). */
const LOOKAHEAD_DAYS = 3

function validateSearch(input: unknown): RoutesSearch {
  const data = (input ?? {}) as Partial<RoutesSearch>
  const originId = String(data.originId ?? "")
  const destinationId = String(data.destinationId ?? "")
  const date = String(data.date ?? "")
  const hour = String(data.hour ?? "")

  if (!getStationById(originId)) throw new Error("Unknown origin station")
  if (!getStationById(destinationId)) throw new Error("Unknown destination station")
  if (originId === destinationId) throw new Error("Origin and destination must differ")
  if (!isValidDateKey(date)) throw new Error("Invalid date")
  if (!isValidClock(hour)) throw new Error("Invalid hour")

  return { originId, destinationId, date, hour, hideSlowTrains: Boolean(data.hideSlowTrains) }
}

async function searchDay(search: RoutesSearch, date: string, hour: string, clientIp: string | undefined) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE}${SEARCH_PATH}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "better-rail-web/1.0 (+https://better-rail.co.il)",
        ...(clientIp ? { "X-Forwarded-For": clientIp } : {}),
      },
      body: JSON.stringify({
        methodName: "searchTrainLuzForDateTime",
        fromStation: Number(search.originId),
        toStation: Number(search.destinationId),
        date,
        hour,
        systemType: "1",
        scheduleType: "ByDeparture",
        languageId: "Hebrew",
        hideSlowTrains: search.hideSlowTrains ?? false,
      }),
    })

    if (!response.ok) throw new Error(`Timetable API responded with ${response.status}`)
    const payload = (await response.json()) as ApiSearchResult
    if (!payload.result) throw new Error(payload.message ?? "Timetable API returned no result")
    return formatTravels(payload.result.travels, date)
  } finally {
    clearTimeout(timeout)
  }
}

// The API returns the whole day regardless of hour (hours before 04:00 also include the previous service day),
// so normalising the hour keeps the cache key stable across a day.
export function apiHourFor(hour: string): string {
  return hour < "04:00" ? hour : "12:00"
}

export const findRoutes = createServerFn({ method: "POST" })
  .validator(validateSearch)
  .handler(async ({ data }): Promise<RoutesResult> => {
    const clientIp = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim()
    const requestedTime = naiveFromParts(data.date, data.hour)

    for (let dayOffset = 0; dayOffset <= LOOKAHEAD_DAYS; dayOffset++) {
      const date = dateKey(addDays(requestedTime, dayOffset))
      const hour = dayOffset === 0 ? apiHourFor(data.hour) : "04:00"
      const routes = await searchDay(data, date, hour, clientIp)

      if (routes.length === 0) continue

      let resultType: ResultType = "normal"
      if (dayOffset > 0) {
        resultType = "different-date"
      } else {
        const closest = routes[closestRouteIndex(routes, requestedTime)]
        if (closest && Math.abs(minutesBetween(requestedTime, closest.departureTime)) >= 90) resultType = "different-hour"
      }

      return { routes, resultType, resultDate: date, requestedDate: data.date, fetchedAt: Date.now() }
    }

    return { routes: [], resultType: "not-found", resultDate: data.date, requestedDate: data.date, fetchedAt: Date.now() }
  })
