import type { RouteItem } from "@/lib/api/types"
import { formatClock } from "@/lib/time"

/** Naive Israel wall-clock → `YYYYMMDDTHHmmss` (used with TZID=Asia/Jerusalem). */
const icsLocal = (naive: number) => new Date(naive).toISOString().replace(/[-:]/g, "").slice(0, 15)

const escapeIcs = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")

export interface CalendarEvent {
  title: string
  description: string
  location: string
  url: string
  route: RouteItem
}

export function buildIcs(event: CalendarEvent): string {
  const { route } = event
  const uid = `${route.id}@better-rail.co.il`
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
  ].join("\r\n")
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
