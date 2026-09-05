import { translate, type Locale } from "@/i18n"
import { stationName, type Station } from "@/data/stations"
import type { RouteItem } from "@/lib/api/types"
import type { RouteSummary } from "@/lib/api/route-format"
import { formatClock, parseNaive, type NaiveTime } from "@/lib/time"
import { formatDayDate, formatDuration, formatDurationLong } from "@/lib/format"
import type { HeroContent } from "@/lib/og/hero"

/**
 * What a shared route link says about itself: the page title and description behind its preview, and the copy set on
 * its hero image. A link to one journey talks about that journey (when it leaves, when it arrives, where to change);
 * a link to the route keeps to the route.
 */

/** The facts about a selected journey the page head and hero image are built from — plain data, so the loader can hand it to `head()`. */
export interface TripFacts {
  /** Train numbers, as in the `trip` search param */
  id: string
  /** `YYYY-MM-DD` service day the journey was picked from */
  date: string
  /** Every train boarded, in order */
  trainNumbers: number[]
  departureTime: NaiveTime
  arrivalTime: NaiveTime
  durationMs: number
  /** Trains changed along the way */
  changes: number
  /** Departure platform; 0 when not assigned yet */
  platform: number
}

export function tripFacts(route: RouteItem, date: string): TripFacts {
  return {
    id: route.id,
    date,
    trainNumbers: route.trains.map((train) => train.trainNumber),
    departureTime: route.departureTime,
    arrivalTime: route.arrivalTime,
    durationMs: route.durationMs,
    changes: route.trains.length - 1,
    platform: route.trains[0].originPlatform,
  }
}

export interface RouteSeoInput {
  locale: Locale
  origin: Station
  destination: Station
  trip?: TripFacts | null
  /** The day's timetable, for the typical journey time */
  summary?: RouteSummary | null
  /** The day and time the link asks for, when it names them */
  requested?: { date?: string; time?: string }
}

/** "Direct" / "1 change" / "2 changes" — as the route cards put it */
function changesText(locale: Locale, changes: number): string {
  if (changes === 0) return translate(locale, "routes.noChange")
  return changes === 1 ? translate(locale, "routes.oneChange") : translate(locale, "routes.changes", { count: changes })
}

/** Hebrew prose wants the long form ("29 דקות"); English reads better short ("29 min"). */
const journeyDuration = (ms: number, locale: Locale) =>
  locale === "he" ? formatDurationLong(ms, locale) : formatDuration(ms, locale)

/** "כ-29 דקות" / "כשעה ו-20 דקות" — the hyphen only before a numeral. */
function approximate(duration: string, locale: Locale): string {
  if (locale !== "he") return duration
  return /^\d/.test(duration) ? `כ-${duration}` : `כ${duration}`
}

export function routeSeoText({ locale, origin, destination, trip, summary, requested }: RouteSeoInput): {
  title: string
  description: string
} {
  // One short title for the route and any of its journeys — it is the tab's name and the preview's headline.
  const title = translate(locale, "seo.routesTitle", { from: stationName(origin, locale), to: stationName(destination, locale) })

  if (trip) {
    const parts = [
      translate(locale, "seo.tripTrain", { numbers: trip.trainNumbers.join(", ") }),
      translate(locale, "seo.tripTimes", { departure: formatClock(trip.departureTime), arrival: formatClock(trip.arrivalTime) }),
      journeyDuration(trip.durationMs, locale),
      changesText(locale, trip.changes),
    ]
    if (trip.platform > 0) parts.push(translate(locale, "details.platform", { platform: trip.platform }))
    return { title, description: parts.join(" · ") }
  }

  const parts: string[] = []
  if (requested?.date || requested?.time) {
    const date = formatDayDate(parseNaive(requested.date ?? new Date().toISOString().slice(0, 10)), locale)
    parts.push(
      requested.time
        ? translate(locale, "seo.routesOnFrom", { date, time: requested.time })
        : translate(locale, "seo.routesOn", { date }),
    )
  }
  if (summary) {
    parts.push(
      translate(locale, "seo.routesDuration", {
        duration: approximate(journeyDuration(summary.medianDurationMs, locale), locale),
      }),
    )
  }
  parts.push(translate(locale, "seo.routesBlurb"))
  return { title, description: parts.join(" · ") }
}

/** Site path of the hero image for the link; the day and journey make it specific to a shared trip. */
export function heroImagePath(
  origin: Station,
  destination: Station,
  locale: Locale,
  trip?: Pick<TripFacts, "id" | "date"> | null,
): string {
  const params = new URLSearchParams({ lang: locale })
  if (trip) {
    params.set("date", trip.date)
    params.set("trip", trip.id)
  }
  return `/og/routes/${origin.id}/${destination.id}.jpg?${params}`
}

export function heroContent({
  locale,
  origin,
  destination,
  trip,
  photo,
}: {
  locale: Locale
  origin: Station
  destination: Station
  trip?: TripFacts | null
  photo?: string
}): HeroContent {
  const content: HeroContent = {
    locale,
    origin: stationName(origin, locale),
    destination: stationName(destination, locale),
    tagline: translate(locale, "seo.heroTagline"),
    photo,
  }
  if (trip) {
    const facts = [formatDuration(trip.durationMs, locale), changesText(locale, trip.changes)]
    if (trip.platform > 0) facts.push(translate(locale, "details.platform", { platform: trip.platform }))
    content.trip = {
      departure: formatClock(trip.departureTime),
      arrival: formatClock(trip.arrivalTime),
      facts: facts.join(" · "),
    }
  }
  return content
}
