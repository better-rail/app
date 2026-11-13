/**
 * Auto-starting a recurring ride: which train it starts, and the push-to-start payload the Live Activity decodes.
 */
import { expect, it } from "bun:test"

import { buildActivityStartPayload, findTravel } from "../../src/devices/auto-start"
import type { RecurringRide } from "../../src/types/device"
import type { RailApiRouteItem } from "../../src/types/rail-response"
import { israelEpoch } from "../../src/utils/israel-time"

const ride: RecurringRide = {
  id: "0b8d6c3e-1f2a-4b5c-9d8e-7f6a5b4c3d2e",
  originId: 4600,
  destinationId: 680,
  departureTime: "07:45",
  days: [0],
  leadMinutes: 10,
  mode: "auto",
  enabled: true,
  skipDates: [],
}

const travel = (departure: string, stops = 2): RailApiRouteItem =>
  ({
    departureTime: `2026-11-15T${departure}:00`,
    arrivalTime: "2026-11-15T09:00:00",
    freeSeats: 0,
    travelMessages: [],
    trains: [
      {
        trainNumber: 777,
        orignStation: 4600,
        destinationStation: 680,
        originPlatform: 2,
        destPlatform: 1,
        freeSeats: 0,
        arrivalTime: "2026-11-15T09:00:00",
        departureTime: `2026-11-15T${departure}:00`,
        stopStations: Array.from({ length: stops }, (_, index) => ({
          stationId: 3000 + index,
          platform: 1,
          arrivalTime: "2026-11-15T08:00:00",
          departureTime: "2026-11-15T08:01:00",
        })),
        handicap: 0,
        crowded: 0,
        trainPosition: { calcDiffMinutes: 3 },
        routeStations: [
          { stationId: 4600, arrivalTime: "07:45", platform: 2 },
          { stationId: 680, arrivalTime: "09:00", platform: 1 },
        ],
      },
    ],
  }) as unknown as RailApiRouteItem

it("starts the train leaving at the ride's time, within a few minutes of a timetable change", () => {
  const departureAt = israelEpoch("2026-11-15T07:45:00")
  expect(findTravel([travel("07:15"), travel("07:47"), travel("08:15")], ride, departureAt)?.departureTime).toBe(
    "2026-11-15T07:47:00",
  )
  // Nothing near the time (a holiday timetable): no ride rather than the wrong train.
  expect(findTravel([travel("06:45"), travel("09:15")], ride, departureAt)).toBeUndefined()
})

it("builds a push-to-start payload the Live Activity decodes, or none when the route doesn't fit", () => {
  const texts = { title: "Your ride started", body: "Platform 2" }
  const payload = buildActivityStartPayload(ride, travel("07:45"), texts, Date.parse("2026-11-15T05:35:00Z"))!

  expect(payload.aps).toMatchObject({
    event: "start",
    "input-push-token": 1,
    "attributes-type": "BetterRailActivityAttributes",
    "content-state": { delay: 3, nextStationId: 4600, status: "waitForTrain" },
    alert: texts,
  })
  expect(payload.aps.attributes.scheduleId).toBe(ride.id)
  // Seconds since 2001-01-01, as Swift decodes a Date.
  expect(payload.aps.attributes.activityStartDate).toBe(Date.parse("2026-11-15T05:35:00Z") / 1000 - 978_307_200)
  // Only the last route station, as the app keeps it.
  expect(payload.aps.attributes.route.trains[0].routeStations).toEqual([{ stationId: 680, arrivalTime: "09:00", platform: 1 }])

  expect(buildActivityStartPayload(ride, travel("07:45", 60), texts, Date.now())).toBeUndefined()
})
