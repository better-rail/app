import { format, isValid, parse } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import type { LanguageCode } from "@/i18n"

export const WEBSITE_ORIGIN = "https://better-rail.co.il"

const WEBSITE_ROUTE_PATH = /^(?:\/en)?\/routes\/(\d+)\/(\d+)\/?$/

export function isWebsiteURL(url: string) {
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === "https:" &&
      !parsed.port &&
      (parsed.hostname === "better-rail.co.il" || parsed.hostname === "www.better-rail.co.il")
    )
  } catch {
    return false
  }
}

export interface WebsiteRoute {
  originId: string
  destinationId: string
  time: number
  trip?: string
  viaStationId?: string
}

export function parseWebsiteRouteURL(url: string): WebsiteRoute | null {
  if (!isWebsiteURL(url)) return null

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const match = parsed.pathname.match(WEBSITE_ROUTE_PATH)
  if (!match) return null
  const [, originId, destinationId] = match

  // Timetable dates represent Israel's wall-clock time in the device's local timezone.
  const now = parse(formatInTimeZone(new Date(), "Asia/Jerusalem", "yyyy-MM-dd HH:mm:ss"), "yyyy-MM-dd HH:mm:ss", new Date())
  const date = parsed.searchParams.get("date") ?? format(now, "yyyy-MM-dd")
  const clock = parsed.searchParams.get("time") ?? format(now, "HH:mm")
  const input = `${date} ${clock}`
  const requested = parse(input, "yyyy-MM-dd HH:mm", now)
  const time = isValid(requested) && format(requested, "yyyy-MM-dd HH:mm") === input ? requested.getTime() : now.getTime()

  const trip = parsed.searchParams.get("trip")
  const viaStationId = parsed.searchParams.get("viaStation")

  return {
    originId,
    destinationId,
    time,
    ...(trip && /^\d+(?:-\d+)*$/.test(trip) ? { trip } : {}),
    ...(viaStationId && /^\d+$/.test(viaStationId) ? { viaStationId } : {}),
  }
}

export function websiteRouteURL({
  originId,
  destinationId,
  time,
  trainNumbers,
  viaStationId,
  locale,
}: {
  originId: string
  destinationId: string
  time: number
  trainNumbers?: Array<string | number>
  viaStationId?: string
  locale: LanguageCode
}) {
  const prefix = locale === "he" ? "" : "/en"
  const when = Number.isFinite(time) ? time : Date.now()
  const params = new URLSearchParams({ date: format(when, "yyyy-MM-dd"), time: format(when, "HH:mm") })
  if (trainNumbers?.length) params.set("trip", trainNumbers.join("-"))
  if (viaStationId) params.set("viaStation", viaStationId)
  return `${WEBSITE_ORIGIN}${prefix}/routes/${originId}/${destinationId}?${params}`
}
