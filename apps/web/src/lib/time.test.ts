import { describe, expect, test } from "bun:test"
import {
  addDays,
  dateKey,
  formatClock,
  hoursOf,
  isSameDay,
  minutesBetween,
  naiveFromParts,
  naiveNow,
  parseNaive,
  toIsoWithOffset,
} from "./time"

describe("naive times", () => {
  test("round-trips API strings regardless of the process timezone", () => {
    const value = parseNaive("2026-09-05T08:24:00")
    expect(formatClock(value)).toBe("08:24")
    expect(dateKey(value)).toBe("2026-09-05")
    expect(hoursOf(value)).toBe(8)
  })

  test("arithmetic stays on the wall clock", () => {
    const value = naiveFromParts("2026-09-05", "23:50")
    expect(formatClock(addDays(value, 1))).toBe("23:50")
    expect(dateKey(addDays(value, 1))).toBe("2026-09-06")
    expect(minutesBetween(value, parseNaive("2026-09-06T00:20:00"))).toBe(30)
    expect(isSameDay(value, parseNaive("2026-09-05T00:00:00"))).toBe(true)
  })

  test("naiveNow reflects Israel's clock", () => {
    // 2026-07-01T10:00Z is 13:00 in Israel (IDT, UTC+3)
    expect(formatClock(naiveNow(new Date("2026-07-01T10:00:00Z")))).toBe("13:00")
    // 2026-01-01T10:00Z is 12:00 in Israel (IST, UTC+2)
    expect(formatClock(naiveNow(new Date("2026-01-01T10:00:00Z")))).toBe("12:00")
  })

  test("toIsoWithOffset applies daylight saving correctly", () => {
    expect(toIsoWithOffset(parseNaive("2026-07-01T08:00:00"))).toBe("2026-07-01T08:00:00+03:00")
    expect(toIsoWithOffset(parseNaive("2026-01-01T08:00:00"))).toBe("2026-01-01T08:00:00+02:00")
  })
})
