import { expect, test } from "bun:test"
import type { RecurringRide } from "@/services/api/device-api"
import { findRecurringRide } from "./recurring-rides"

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
