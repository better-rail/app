import { test, expect } from "bun:test"
import { calculateDelayedTime, formatClockTime, formatTime, parseApiDate } from "./date-helpers"

test("parses the date correctly", () => {
  const apiDate = "14/04/2021 07:05:00"
  const targetDate = "04/14/2021 07:05:00"
  const formattedDate = parseApiDate(apiDate)

  expect(formattedDate).toBe(Date.parse(targetDate))
})

test("throws when invalid date is provided", () => {
  const invalidDate = "04/14/2021 07:05:00"
  expect(() => parseApiDate(invalidDate)).toThrow()
})

test("formatTime renders either clock style", () => {
  const afternoon = new Date(2026, 0, 1, 15, 5)
  expect(formatTime(afternoon)).toBe("15:05")
  expect(formatTime(afternoon, true)).toBe("3:05 PM")
  expect(formatTime(new Date(2026, 0, 1, 0, 30), true)).toBe("12:30 AM")
  expect(calculateDelayedTime(afternoon, 10)).toBe("15:15")
  expect(formatClockTime("15:05")).toBe("15:05")
  expect(formatClockTime("15:05", true)).toBe("3:05 PM")
})
