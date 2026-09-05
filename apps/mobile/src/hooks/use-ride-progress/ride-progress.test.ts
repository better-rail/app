import { test, expect } from "bun:test"
import { buildRoute, MINUTE } from "../../../test/fixtures/ride-route"
import { getStopStationStatus } from "./get-stop-stations-status"
import { getStatusEndDate, rideProgress } from "./utils"

// A station id that isn't part of the route - this is what we end up with when the route is
// refetched and its stop stations change while the previous one is still being rendered.
const UNKNOWN_STATION_ID = 999

test("marks every station idle when the next station isn't part of the route", () => {
  const route = buildRoute(10 * MINUTE)

  const stations = getStopStationStatus({
    route,
    nextStationId: UNKNOWN_STATION_ID,
    status: "loading",
    enabled: true,
  })

  expect(stations[10]).toEqual({ top: "idle", bottom: "idle", stationId: 10 })
  expect(stations[11]).toEqual({ top: "idle", bottom: "idle", stationId: 11 })
  expect(stations[20]).toEqual({ top: "idle", bottom: "idle", stationId: 20 })
})

test("marks the passed stations while en route", () => {
  const route = buildRoute(-15 * MINUTE)

  const stations = getStopStationStatus({ route, nextStationId: 11, status: "inTransit", enabled: true })

  // station 10 was already visited, and the leg between it and station 11 is under way
  expect(stations[10]).toEqual({ top: "passed", bottom: "inProgress" })
  expect(stations[11]).toEqual({ top: "inProgress", bottom: "idle" })
})

test("has no end date when the next station isn't part of the route", () => {
  const route = buildRoute(10 * MINUTE)

  const endDate = getStatusEndDate(route, { status: "loading", delay: 0, nextStationId: UNKNOWN_STATION_ID })

  expect(endDate).toBeNull()
})

test("ends on the departure time while waiting for the train", () => {
  const route = buildRoute(10 * MINUTE)

  const endDate = getStatusEndDate(route, { status: "waitForTrain", delay: 0, nextStationId: 1 })

  expect(endDate?.getTime()).toBe(route.trains[0].departureTime)
})

test("applies the delay to the end date", () => {
  const route = buildRoute(10 * MINUTE)

  const endDate = getStatusEndDate(route, { status: "waitForTrain", delay: 5, nextStationId: 1 })

  expect(endDate?.getTime()).toBe(route.trains[0].departureTime + 5 * MINUTE)
})

test("has no end date when the delay isn't a number", () => {
  const route = buildRoute(10 * MINUTE)

  // Number(undefined) on a push payload that's missing its delay field - this used to produce an
  // Invalid Date, which is truthy and slipped past the caller's null check
  const endDate = getStatusEndDate(route, { status: "waitForTrain", delay: NaN, nextStationId: 1 })

  expect(endDate).toBeNull()
})

test("reports no progress when the next station isn't part of the route", () => {
  const route = buildRoute(10 * MINUTE)

  expect(rideProgress(route, UNKNOWN_STATION_ID)).toEqual([0, 0])
})
