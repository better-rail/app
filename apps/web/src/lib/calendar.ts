import type { RouteItem } from "@/lib/api/types"
import { formatClock } from "@/lib/time"

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
  route: RouteItem
}

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
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = `better-rail-${formatClock(event.route.departureTime).replace(":", "")}.ics`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}
