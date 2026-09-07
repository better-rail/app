import { describe, expect, test } from "bun:test"
import {
  compareYearMonth,
  daysInMonth,
  monthGrid,
  monthTitle,
  sameDayIn,
  shiftMonth,
  weekdayLabels,
  yearMonthOf,
} from "./month-grid"

describe("monthGrid", () => {
  test("six sunday-first weeks around september 2026", () => {
    const cells = monthGrid({ year: 2026, month: 9 })
    expect(cells).toHaveLength(42)
    // 1 September 2026 is a Tuesday, so the grid opens on Sunday the 30th of August.
    expect(cells[0]).toMatchObject({ key: "2026-08-30", day: 30, inMonth: false })
    expect(cells[2]).toMatchObject({ key: "2026-09-01", day: 1, inMonth: true, weekend: false })
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(30)
    expect(cells[5]).toMatchObject({ key: "2026-09-04", weekend: true })
    expect(cells[6]).toMatchObject({ key: "2026-09-05", weekend: true })
    expect(cells[7].weekend).toBe(false)
  })

  test("a month that starts on sunday still pads to six rows", () => {
    const cells = monthGrid({ year: 2026, month: 3 })
    expect(cells[0].key).toBe("2026-03-01")
    expect(cells[41].key).toBe("2026-04-11")
  })
})

describe("month arithmetic", () => {
  test("shiftMonth wraps years", () => {
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
    expect(shiftMonth({ year: 2026, month: 9 }, 15)).toEqual({ year: 2027, month: 12 })
  })

  test("compareYearMonth orders months", () => {
    expect(compareYearMonth({ year: 2026, month: 9 }, { year: 2026, month: 9 })).toBe(0)
    expect(compareYearMonth({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(0)
    expect(compareYearMonth({ year: 2026, month: 8 }, { year: 2026, month: 9 })).toBeLessThan(0)
  })

  test("sameDayIn clamps to the shorter month", () => {
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29)
    expect(sameDayIn("2026-01-31", { year: 2026, month: 2 })).toBe("2026-02-28")
    expect(sameDayIn("2026-09-05", yearMonthOf("2026-10-01"))).toBe("2026-10-05")
  })
})

describe("labels", () => {
  test("hebrew", () => {
    expect(weekdayLabels("he")).toEqual(["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"])
    expect(monthTitle({ year: 2026, month: 9 }, "he")).toBe("ספטמבר 2026")
  })

  test("english", () => {
    expect(weekdayLabels("en")).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"])
    expect(monthTitle({ year: 2026, month: 9 }, "en")).toBe("September 2026")
  })
})
