import { expect, test } from "bun:test"
import type { RecurringRide } from "@/services/api/device-api"
import { findRecurringRide, isPastOneTimeRide, rideToSaveOver } from "./recurring-rides"

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

const trip = { originId: 680, destinationId: 9600, departureTime: "07:39" }
const once = (id: string, date: string): RecurringRide => ({ ...ride(id), days: [], date })

test("a route through a via station is a different ride from the direct one", () => {
  const rides = [ride("direct"), ride("via", 3700)]
  expect(findRecurringRide(rides, trip)?.id).toBe("direct")
  expect(findRecurringRide(rides, { ...trip, viaStationId: 3700 })?.id).toBe("via")
  expect(findRecurringRide(rides, { ...trip, viaStationId: 4600 })).toBeUndefined()
})

test("the route menu shows the one-time ride on its date, the weekly ride on other dates", () => {
  const rides = [ride("weekly"), once("once", "2026-11-17")]
  expect(findRecurringRide(rides, trip, "2026-11-17")?.id).toBe("once")
  expect(findRecurringRide(rides, trip, "2026-11-18")?.id).toBe("weekly")
})

// A save that picks the wrong ride leaves two rides of a kind, and the train starts twice
test("a save replaces the ride of the kind and date picked", () => {
  const rides = [ride("weekly"), once("once", "2026-11-17")]
  expect(rideToSaveOver(rides, trip, "2026-11-17")?.id).toBe("once")
  expect(rideToSaveOver([ride("weekly")], trip, "2026-11-17")).toBeUndefined()
  expect(rideToSaveOver(rides, trip)?.id).toBe("weekly")
})

test("a one-time ride is past once its train left", () => {
  const oneTime = once("once", "2026-11-17")
  expect(isPastOneTimeRide(oneTime, new Date(2026, 10, 17, 7, 38).getTime())).toBe(false)
  expect(isPastOneTimeRide(oneTime, new Date(2026, 10, 17, 7, 39).getTime())).toBe(true)
  expect(isPastOneTimeRide(ride("weekly"), new Date(2027, 0, 1).getTime())).toBe(false)
})
