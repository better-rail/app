import { describe, expect, test } from "bun:test"
import { parseDateInput, parseTimeInput } from "./parse-input"

describe("parseTimeInput", () => {
  test("accepts the ways people type a time", () => {
    expect(parseTimeInput("9")).toBe("09:00")
    expect(parseTimeInput("09")).toBe("09:00")
    expect(parseTimeInput("930")).toBe("09:30")
    expect(parseTimeInput("1630")).toBe("16:30")
    expect(parseTimeInput("16:17")).toBe("16:17")
    expect(parseTimeInput("16.17")).toBe("16:17")
    expect(parseTimeInput("16 17")).toBe("16:17")
    expect(parseTimeInput(" 7:5 ")).toBe("07:05")
    expect(parseTimeInput("0:00")).toBe("00:00")
    expect(parseTimeInput("23:59")).toBe("23:59")
  })

  test("rejects what isn't a time of day", () => {
    expect(parseTimeInput("")).toBeNull()
    expect(parseTimeInput("24:00")).toBeNull()
    expect(parseTimeInput("12:60")).toBeNull()
    expect(parseTimeInput("93")).toBeNull()
    expect(parseTimeInput("16:30:00")).toBeNull()
    expect(parseTimeInput("noon")).toBeNull()
  })
})

describe("parseDateInput", () => {
  const today = "2026-09-05"

  test("day-first with or without a year", () => {
    expect(parseDateInput("7/9", today)).toBe("2026-09-07")
    expect(parseDateInput("07/09/2026", today)).toBe("2026-09-07")
    expect(parseDateInput("7.9.26", today)).toBe("2026-09-07")
    expect(parseDateInput("7-9-2027", today)).toBe("2027-09-07")
    expect(parseDateInput("2026-09-07", today)).toBe("2026-09-07")
    expect(parseDateInput("5/9", today)).toBe(today)
  })

  test("a past day-and-month means next year", () => {
    expect(parseDateInput("3/1", today)).toBe("2027-01-03")
    expect(parseDateInput("4/9", today)).toBe("2027-09-04")
  })

  test("the field's own labels", () => {
    expect(parseDateInput("today", today)).toBe(today)
    expect(parseDateInput("Tomorrow", today)).toBe("2026-09-06")
    expect(parseDateInput("היום", today)).toBe(today)
    expect(parseDateInput("מחר", today)).toBe("2026-09-06")
  })

  test("rejects the past, impossible days, and noise", () => {
    expect(parseDateInput("4/9/2026", today)).toBeNull()
    expect(parseDateInput("31/2", today)).toBeNull()
    expect(parseDateInput("29/2/2027", today)).toBeNull()
    expect(parseDateInput("29/2/2028", today)).toBe("2028-02-29")
    expect(parseDateInput("13/13", today)).toBeNull()
    expect(parseDateInput("", today)).toBeNull()
    expect(parseDateInput("next week", today)).toBeNull()
  })
})
