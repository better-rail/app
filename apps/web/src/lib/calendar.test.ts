import { describe, expect, test } from "bun:test"
import { buildIcs, foldIcsLine, googleCalendarUrl, type CalendarEvent } from "./calendar"
import { parseNaive } from "./time"
import type { RouteItem } from "./api/types"

const route: RouteItem = {
  id: "100",
  departureTime: parseNaive("2026-09-05T08:24:00"),
  arrivalTime: parseNaive("2026-09-05T09:00:00"),
  durationMs: 36 * 60_000,
  delay: 0,
  arrivalDelay: 0,
  isExchange: false,
  isCancelled: false,
  isMuchLonger: false,
  isMuchShorter: false,
  trains: [],
}

const event: CalendarEvent = {
  title: "🚆 תל אביב - סבידור מרכז ← חיפה - חוף הכרמל",
  description: "📅 שבת, 5 בספטמבר 2026\nיוצאת ב 08:24\nמגיעה ב 09:00; בערך",
  location: "תחנת רכבת תל אביב - סבידור מרכז",
  url: "https://better-rail.co.il/routes/3700/2300?trip=100",
  route,
}

describe("buildIcs", () => {
  const ics = buildIcs(event)
  const lines = ics.split("\r\n")

  test("defines the timezone its times refer to", () => {
    expect(lines).toContain("TZID:Asia/Jerusalem")
    expect(lines).toContain("DTSTART;TZID=Asia/Jerusalem:20260905T082400")
    expect(lines).toContain("DTEND;TZID=Asia/Jerusalem:20260905T090000")
    expect(ics.indexOf("END:VTIMEZONE")).toBeLessThan(ics.indexOf("BEGIN:VEVENT"))
  })

  test("keeps every line within 75 octets and folds without splitting a character", () => {
    const encoder = new TextEncoder()
    for (const line of lines) expect(encoder.encode(line).length).toBeLessThanOrEqual(75)
    // Unfolding gives the original content back, escaped.
    const unfolded = ics.replace(/\r\n /g, "")
    expect(unfolded).toContain("DESCRIPTION:📅 שבת\\, 5 בספטמבר 2026\\nיוצאת ב 08:24\\nמגיעה ב 09:00\\; בערך")
    expect(unfolded).toContain(`SUMMARY:${event.title}`)
  })
})

describe("foldIcsLine", () => {
  test("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:hello")).toBe("SUMMARY:hello")
  })

  test("folds long ASCII at 75 octets", () => {
    const folded = foldIcsLine("X".repeat(200))
    const pieces = folded.split("\r\n")
    expect(pieces[0]).toHaveLength(75)
    expect(pieces[1]).toBe(` ${"X".repeat(74)}`)
    expect(folded.replace(/\r\n /g, "")).toBe("X".repeat(200))
  })
})

describe("googleCalendarUrl", () => {
  test("uses Israel local times with the calendar's own timezone", () => {
    const url = new URL(googleCalendarUrl(event))
    expect(url.searchParams.get("dates")).toBe("20260905T082400/20260905T090000")
    expect(url.searchParams.get("ctz")).toBe("Asia/Jerusalem")
  })
})
