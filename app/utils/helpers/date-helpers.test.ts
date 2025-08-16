import { test, expect } from "bun:test"
import { parseApiDate } from "./date-helpers"

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
