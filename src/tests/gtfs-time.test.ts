import {
  parseOffsetSec,
  formatOffset,
  localIso,
  toEpochMs,
  addDays,
  railServiceDatesForQuery,
} from "../utils/gtfs-time"

describe("gtfs-time", () => {
  it("parses extended times (hours >= 24)", () => {
    expect(parseOffsetSec("25:30:00")).toBe(25 * 3600 + 30 * 60)
    expect(parseOffsetSec("08:05")).toBe(8 * 3600 + 5 * 60)
    expect(parseOffsetSec("27:59:59")).toBe(27 * 3600 + 59 * 60 + 59)
  })

  it("round-trips parse/format", () => {
    expect(formatOffset(parseOffsetSec("25:30:00"))).toBe("25:30:00")
    expect(formatOffset(parseOffsetSec("08:05"))).toBe("08:05:00")
  })

  it("rejects malformed times", () => {
    expect(() => parseOffsetSec("noon")).toThrow()
    expect(() => parseOffsetSec("10:75:00")).toThrow()
  })

  it("converts (service date, extended time) to a naive wall-clock ISO string", () => {
    // Rail spec example: an extended 25:30 on the service day rolls to 01:30 next day.
    expect(localIso("2025-04-14", parseOffsetSec("25:30:00"))).toBe("2025-04-15T01:30:00")
    // Plain time stays on the same day.
    expect(localIso("2025-04-14", parseOffsetSec("08:05:00"))).toBe("2025-04-14T08:05:00")
    expect(localIso("2026-06-27", parseOffsetSec("14:30:00"))).toBe("2026-06-27T14:30:00")
  })

  it("orders connections by absolute epoch", () => {
    const a = toEpochMs("2025-04-14", parseOffsetSec("23:50:00"))
    const b = toEpochMs("2025-04-14", parseOffsetSec("25:30:00")) // 01:30 next day
    expect(b).toBeGreaterThan(a)
    expect((b - a) / 1000).toBe(100 * 60) // 1h40m apart
  })

  it("adds days across month boundaries", () => {
    expect(addDays("2025-04-30", 1)).toBe("2025-05-01")
    expect(addDays("2025-01-01", -1)).toBe("2024-12-31")
  })

  it("picks rail service dates for a query window", () => {
    expect(railServiceDatesForQuery("2026-06-27", "14:00")).toEqual(["2026-06-27", "2026-06-28"])
    // Before 04:00 also looks back a day for pre-midnight extended-time trips.
    expect(railServiceDatesForQuery("2026-06-27", "01:00")).toEqual([
      "2026-06-26",
      "2026-06-27",
      "2026-06-28",
    ])
  })
})
