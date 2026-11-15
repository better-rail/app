import { expect, test } from "bun:test"
import type { RecurringRide } from "@/services/api/device-api"
import { findRecurringRide, isPastOneTimeRide } from "./recurring-rides"

const ride = (id: string, viaStationId?: number): RecurringRide => ({
  id,
  originId: 680,
  destinationId: 9600,
  ...(viaStationId && { viaStationId }),
  departureTime: "07:39",
  days: [0, 1, 2, 3, 4],
  leadMinutes: 15,
  mode: "auto",
  enabled: true,
  skipDates: [],
})

test("a route through a via station is a different ride from the direct one", () => {
  const rides = [ride("direct"), ride("via", 3700)]
  expect(findRecurringRide(rides, 680, 9600, "07:39")?.id).toBe("direct")
  expect(findRecurringRide(rides, 680, 9600, "07:39", 3700)?.id).toBe("via")
  expect(findRecurringRide(rides, 680, 9600, "07:39", 4600)).toBeUndefined()
})

test("a one-time ride is found on its date, the weekly ride on other dates", () => {
  const rides = [ride("weekly"), { ...ride("once"), days: [], date: "2026-11-17" }]
  expect(findRecurringRide(rides, 680, 9600, "07:39", undefined, "2026-11-17")?.id).toBe("once")
  expect(findRecurringRide(rides, 680, 9600, "07:39", undefined, "2026-11-18")?.id).toBe("weekly")
  expect(findRecurringRide([rides[1]], 680, 9600, "07:39", undefined, "2026-11-18")).toBeUndefined()
})

test("a one-time ride is past once its train left", () => {
  const once = { ...ride("once"), days: [], date: "2026-11-17" }
  expect(isPastOneTimeRide(once, new Date(2026, 10, 17, 7, 38).getTime())).toBe(false)
  expect(isPastOneTimeRide(once, new Date(2026, 10, 17, 7, 39).getTime())).toBe(true)
  expect(isPastOneTimeRide(ride("weekly"), new Date(2027, 0, 1).getTime())).toBe(false)
})
