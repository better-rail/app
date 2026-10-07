import { format, isValid, parse } from "date-fns"
import type { LanguageCode } from "@/i18n"

export const WEBSITE_ORIGIN = "https://better-rail.co.il"

const WEBSITE_URL = /^https:\/\/(www\.)?better-rail\.co\.il(\/|$|\?|#)/i
const WEBSITE_ROUTE_PATH = /^(?:\/en)?\/routes\/(\d+)\/(\d+)\/?$/

export function isWebsiteURL(url: string) {
  return WEBSITE_URL.test(url)
}

/** Reads a better-rail.co.il routes page link, e.g. `/en/routes/3700/4600?date=2026-10-06&time=09:00`. */
export function parseWebsiteRouteURL(url: string): { originId: string; destinationId: string; time: number } | null {
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

  const date = parsed.searchParams.get("date")
  const clock = parsed.searchParams.get("time") ?? "00:00"
  const requested = date ? parse(`${date} ${clock}`, "yyyy-MM-dd HH:mm", new Date()) : null
  const time = requested && isValid(requested) ? requested.getTime() : Date.now()

  return { originId, destinationId, time }
}

/** The better-rail.co.il page showing the same routes, for Handoff. `trip` selects a journey by its train numbers. */
export function websiteRouteURL({
  originId,
  destinationId,
  time,
  trainNumbers,
  locale,
}: {
  originId: string
  destinationId: string
  time: number
  trainNumbers?: Array<string | number>
  locale: LanguageCode
}) {
  // The website is in Hebrew and English only.
  const prefix = locale === "he" ? "" : "/en"
  const when = Number.isFinite(time) ? time : Date.now()
  const params = new URLSearchParams({ date: format(when, "yyyy-MM-dd"), time: format(when, "HH:mm") })
  if (trainNumbers?.length) params.set("trip", trainNumbers.join("-"))
  return `${WEBSITE_ORIGIN}${prefix}/routes/${originId}/${destinationId}?${params}`
}
