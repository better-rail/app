/**
 * When a recurring ride's reminder is due, on Israel's clock.
 */
import { describe, expect, it } from "bun:test"

import { nextDueAt, nextReminder } from "../../src/devices/schedule"
import type { RecurringRide } from "../../src/types/device"
import { israelEpoch } from "../../src/utils/israel-time"

const ride = (overrides: Partial<RecurringRide> = {}): RecurringRide => ({
  id: crypto.randomUUID(),
  originId: 3700,
  destinationId: 3500,
  departureTime: "07:45",
  days: [0, 1, 2, 3, 4],
  leadMinutes: 10,
  mode: "notify",
  enabled: true,
  skipDates: [],
  ...overrides,
})

// Sunday 2026-11-15, 06:00 in Israel (winter time, UTC+2).
const sundayMorning = israelEpoch("2026-11-15T06:00:00")

describe("nextDueAt", () => {
  it("is the lead time before today's departure, on Israel's clock", () => {
    expect(nextDueAt(ride(), sundayMorning)).toBe(israelEpoch("2026-11-15T07:35:00"))
  })

  it("moves to the next of the ride's weekdays once today's has passed, skipping skipped dates", () => {
    const afterToday = israelEpoch("2026-11-15T08:00:00")
    expect(nextDueAt(ride(), afterToday)).toBe(israelEpoch("2026-11-16T07:35:00"))
    expect(nextDueAt(ride({ skipDates: ["2026-11-16"] }), afterToday)).toBe(israelEpoch("2026-11-17T07:35:00"))
    // Thursday evening: Friday and Saturday aren't ride days.
    expect(nextDueAt(ride(), israelEpoch("2026-11-19T20:00:00"))).toBe(israelEpoch("2026-11-22T07:35:00"))
  })

  it("is the evening before for a ride just after midnight", () => {
    const late = ride({ departureTime: "00:10", leadMinutes: 20, days: [1] })
    expect(nextDueAt(late, israelEpoch("2026-11-15T23:00:00"))).toBe(israelEpoch("2026-11-15T23:50:00"))
  })

  it("follows daylight saving time", () => {
    // Summer time (UTC+3) starts on Friday 2027-03-26.
    expect(nextDueAt(ride({ days: [0] }), israelEpoch("2027-03-27T12:00:00"))).toBe(Date.parse("2027-03-28T04:35:00Z"))
  })

  it("is never due when disabled", () => {
    expect(nextDueAt(ride({ enabled: false }), sundayMorning)).toBeUndefined()
  })
})

it("nextReminder groups the rides due at the same time", () => {
  const a = ride()
  const b = ride({ departureTime: "07:50", leadMinutes: 15 })
  const later = ride({ departureTime: "09:00" })
  expect(nextReminder([later, a, b], sundayMorning)).toEqual({ at: israelEpoch("2026-11-15T07:35:00"), rideIds: [a.id, b.id] })
  expect(nextReminder([], sundayMorning)).toBeUndefined()
})
