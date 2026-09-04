import { describe, expect, test } from "bun:test"
import { formatDuration, formatDurationLong, formatDayLabel } from "./format"
import { parseNaive } from "./time"

const MIN = 60_000

describe("formatDuration", () => {
  test("hebrew", () => {
    expect(formatDuration(45 * MIN, "he")).toBe("45 דק׳")
    expect(formatDuration(60 * MIN, "he")).toBe("שעה")
    expect(formatDuration(80 * MIN, "he")).toBe("שעה ו-20 דק׳")
    expect(formatDuration(120 * MIN, "he")).toBe("שעתיים")
    expect(formatDuration(185 * MIN, "he")).toBe("3 שעות ו-5 דק׳")
    expect(formatDurationLong(61 * MIN, "he")).toBe("שעה ו-דקה")
  })

  test("english", () => {
    expect(formatDuration(45 * MIN, "en")).toBe("45 min")
    expect(formatDuration(60 * MIN, "en")).toBe("1h")
    expect(formatDuration(80 * MIN, "en")).toBe("1h 20m")
    expect(formatDurationLong(80 * MIN, "en")).toBe("1 hour and 20 minutes")
  })
})

describe("formatDayLabel", () => {
  const now = parseNaive("2026-09-05T10:00:00")
  test("marks today and tomorrow", () => {
    expect(formatDayLabel(parseNaive("2026-09-05T18:00:00"), "en", now)).toMatch(/^Today · Saturday/)
    expect(formatDayLabel(parseNaive("2026-09-06T02:00:00"), "he", now)).toMatch(/^מחר · /)
    expect(formatDayLabel(parseNaive("2026-09-08T02:00:00"), "en", now)).toBe("Tuesday 8 September")
  })
})
