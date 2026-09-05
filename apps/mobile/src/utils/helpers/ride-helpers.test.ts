import { test, expect } from "bun:test"
import { buildRoute, MINUTE } from "../../../test/fixtures/ride-route"
import { findClosestStationInRoute, getPreviousTrainFromStationId, getRideStatus, getTrainFromStationId } from "./ride-helpers"

test("finds the train a stop station belongs to", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getTrainFromStationId(route, 11)?.trainNumber).toBe(100)
  expect(getTrainFromStationId(route, 20)?.trainNumber).toBe(200)
})

test("returns undefined when the station isn't part of the route", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getTrainFromStationId(route, 999)).toBeUndefined()
})

test("has no previous train for the first leg, and the first leg for the second", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getPreviousTrainFromStationId(route, 10)).toBeNull()
  expect(getPreviousTrainFromStationId(route, 20)?.trainNumber).toBe(100)
  expect(getPreviousTrainFromStationId(route, 999)).toBeNull()
})

test("falls back to the final destination once the route is over", () => {
  // the whole route is in the past, so no station is still ahead of us
  const route = buildRoute(-2 * 60 * MINUTE)

  expect(findClosestStationInRoute(route)).toBe(3)
})

test("tracks the closest station as the ride advances", () => {
  expect(findClosestStationInRoute(buildRoute(10 * MINUTE))).toBe(1)
  // 15 minutes in: past station 10, before station 11
  expect(findClosestStationInRoute(buildRoute(-15 * MINUTE))).toBe(11)
})

test("reports a loading status instead of throwing when the train is missing", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getRideStatus(route, undefined, 999)).toBe("loading")
  expect(getRideStatus(route, getTrainFromStationId(route, 999), 999)).toBe("loading")
})

test("waits for the train before it departs from the route origin", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getRideStatus(route, route.trains[0], 1)).toBe("waitForTrain")
})

test("is in transit while heading towards an intermediate stop station", () => {
  const route = buildRoute(-15 * MINUTE)

  expect(getRideStatus(route, route.trains[0], 11)).toBe("inTransit")
})

test("reports inExchange from the moment the exchange station becomes the next one", () => {
  // 15 minutes into a 30 minute first leg. the exchange status is keyed off the *next* train
  // having a future departure time, not off the current leg having arrived - so the ride reads
  // as inExchange while it's still approaching the exchange station.
  const route = buildRoute(-15 * MINUTE)

  expect(getRideStatus(route, route.trains[0], 2)).toBe("inExchange")
})

test("is in exchange once the first leg arrived and the second hasn't departed", () => {
  // 35 minutes in: the first leg arrived at minute 30, the second departs at minute 40
  const route = buildRoute(-35 * MINUTE)

  expect(getRideStatus(route, route.trains[0], 2)).toBe("inExchange")
})

test("waits for the train at the exchange station once the second leg is the current one", () => {
  const route = buildRoute(-35 * MINUTE)

  // the second leg's origin is the exchange station, and the first leg has already arrived
  expect(getRideStatus(route, route.trains[1], 2)).toBe("inExchange")
})

test("has arrived once the final leg reached its destination", () => {
  // 70 minutes in, and the route ends at minute 60
  const route = buildRoute(-70 * MINUTE)

  expect(getRideStatus(route, route.trains[1], 3)).toBe("arrived")
})
