import type { RouteItem } from "@/lib/api/types"
import { stationNameById } from "@/data/stations"
import { localePath, type Locale } from "@/i18n"
import { formatLongDate } from "@/lib/format"
import { dateKey, formatClock } from "@/lib/time"

/** Naive Israel wall-clock → `YYYYMMDDTHHmmss` (used with TZID=Asia/Jerusalem). */
const icsLocal = (naive: number) => new Date(naive).toISOString().replace(/[-:]/g, "").slice(0, 15)

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

/**
 * Israel's clock, defined in the file: a `TZID` on its own is only a name, and a calendar that does not know it
 * (Outlook, among others) reads the times as UTC — two or three hours off. Summer time starts on the Friday before
 * the last Sunday of March and ends on the last Sunday of October.
 */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Jerusalem",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0200",
  "TZNAME:IST",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0300",
  "TZNAME:IDT",
  "DTSTART:19700327T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29",
  "END:DAYLIGHT",
  "END:VTIMEZONE",
]

/** RFC 5545 content lines run to 75 octets; a Hebrew description is two bytes a letter and folds well before that. */
const MAX_LINE_OCTETS = 75

/** Folds a content line at octet boundaries, never inside a character, continuing each piece with a single space. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const pieces: string[] = []
  let piece = ""
  let octets = 0
  let limit = MAX_LINE_OCTETS
  for (const char of line) {
    const size = encoder.encode(char).length
    if (octets + size > limit) {
      pieces.push(piece)
      piece = ""
      octets = 0
      limit = MAX_LINE_OCTETS - 1 // the continuation's leading space counts
    }
    piece += char
    octets += size
  }
  pieces.push(piece)
  return pieces.join("\r\n ")
}

export interface CalendarEvent {
  title: string
  description: string
  location: string
  url: string
  route: Pick<RouteItem, "id" | "departureTime" | "arrivalTime">
}

/** The journey a calendar entry describes: everything the event is built from, and all a hosted file's link carries. */
export interface CalendarTrip {
  originId: string
  destinationId: string
  locale: Locale
  route: Pick<RouteItem, "id" | "departureTime" | "arrivalTime">
}

/** The text a journey is shared and saved with: the route, its date and its times. */
export function tripSummary({ originId, destinationId, locale, route }: CalendarTrip): string {
  return [
    `🚆 ${tripTitle({ originId, destinationId, locale })}`,
    "",
    `📅 ${formatLongDate(route.departureTime, locale)}`,
    `${locale === "he" ? "יוצאת ב" : "Departs at"} ${formatClock(route.departureTime)}`,
    `${locale === "he" ? "מגיעה ב" : "Arrives at"} ${formatClock(route.arrivalTime)}`,
  ].join("\n")
}

function tripTitle({ originId, destinationId, locale }: Omit<CalendarTrip, "route">): string {
  const arrow = locale === "he" ? "←" : "→"
  return `${stationNameById(originId, locale)} ${arrow} ${stationNameById(destinationId, locale)}`
}

/** `url` is the page the event links back to — the shared link on the client, rebuilt from the request on the server. */
export function tripCalendarEvent(trip: CalendarTrip, url: string): CalendarEvent {
  const origin = stationNameById(trip.originId, trip.locale)
  return {
    title: `🚆 ${tripTitle(trip)}`,
    description: tripSummary(trip),
    location: trip.locale === "he" ? `תחנת רכבת ${origin}` : `${origin} train station`,
    url,
    route: trip.route,
  }
}

/** Site path of the journey's results page with the trip selected — where a saved event links back to. */
export const tripPagePath = ({ originId, destinationId, locale, route }: CalendarTrip) =>
  `${localePath(locale, `/routes/${originId}/${destinationId}`)}?${new URLSearchParams({
    date: dateKey(route.departureTime),
    trip: route.id,
  })}`

/** `YYYY-MM-DDTHH:mm`, the shape a hosted file's link carries its times in. */
const linkTime = (naive: number) => new Date(naive).toISOString().slice(0, 16)

/**
 * Site path of the journey's `.ics`, served by the `/calendar` route. Opening it on iOS shows Calendar's "add event"
 * sheet — a `webcal://` link would instead offer to subscribe to it as a whole new calendar.
 */
export const tripCalendarFilePath = ({ originId, destinationId, locale, route }: CalendarTrip) =>
  `/calendar/routes/${originId}/${destinationId}.ics?${new URLSearchParams({
    trip: route.id,
    dep: linkTime(route.departureTime),
    arr: linkTime(route.arrivalTime),
    lang: locale,
  })}`

export function buildIcs(event: CalendarEvent): string {
  const { route } = event
  const uid = `${route.id}-${route.departureTime}@better-rail.co.il`
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Better Rail//Web//HE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Jerusalem:${icsLocal(route.departureTime)}`,
    `DTEND;TZID=Asia/Jerusalem:${icsLocal(route.arrivalTime)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldIcsLine)
    .join("\r\n")
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsLocal(event.route.departureTime)}/${icsLocal(event.route.arrivalTime)}`,
    ctz: "Asia/Jerusalem",
    details: `${event.description}\n${event.url}`,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function downloadIcs(event: CalendarEvent) {
  const blob = new Blob([buildIcs(event)], {
    type: "text/calendar;charset=utf-8",
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = `better-rail-${formatClock(event.route.departureTime).replace(":", "")}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
