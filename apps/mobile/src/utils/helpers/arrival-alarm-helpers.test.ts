import { test, expect } from "bun:test"
import { buildRoute, MINUTE } from "../../../test/fixtures/ride-route"
import {
  getArrivalAlarmFireDate,
  getArrivalAlarmStops,
  getNextArrivalAlarmStop,
  getNextStopTrain,
  toggleArrivalAlarmStop,
} from "./arrival-alarm-helpers"

test("rings the lead time before each stop's delayed arrival", () => {
  const route = buildRoute(10 * MINUTE)
  route.trains[1].delay = 3

  expect(getArrivalAlarmFireDate(route, 0, 5)).toBe(route.trains[0].arrivalTime - 5 * MINUTE)
  expect(getArrivalAlarmFireDate(route, 1, 5)).toBe(route.trains[1].arrivalTime - 2 * MINUTE)
})

test("rings as the train departs when the ride on it is shorter than the lead time", () => {
  const route = buildRoute(10 * MINUTE)

  expect(getArrivalAlarmFireDate(route, 1, 30)).toBe(route.trains[1].departureTime)
})

test("defaults to the next stop the rider gets off", () => {
  // On the first train
  expect(getArrivalAlarmStops(buildRoute(-10 * MINUTE), undefined)).toEqual([0])
  // On the second train
  expect(getArrivalAlarmStops(buildRoute(-35 * MINUTE), undefined)).toEqual([1])
  // Arrived
  expect(getArrivalAlarmStops(buildRoute(-2 * 60 * MINUTE), undefined)).toEqual([])
  expect(getNextStopTrain(buildRoute(-2 * 60 * MINUTE))).toBe(-1)
})

test("keeps the rider's choice while it has a stop ahead", () => {
  expect(getArrivalAlarmStops(buildRoute(-10 * MINUTE), [0, 1])).toEqual([0, 1])
  expect(getArrivalAlarmStops(buildRoute(-35 * MINUTE), [0, 1])).toEqual([1])
  // Only the passed transfer was chosen
  expect(getArrivalAlarmStops(buildRoute(-35 * MINUTE), [0])).toEqual([1])
})

test("follows the delay when telling a passed stop", () => {
  const route = buildRoute(-35 * MINUTE)
  route.trains[0].delay = 10

  expect(getNextStopTrain(route)).toBe(0)
})

test("checks and unchecks stops, but never the last one", () => {
  expect(toggleArrivalAlarmStop([1], 0)).toEqual([0, 1])
  expect(toggleArrivalAlarmStop([0, 1], 1)).toEqual([0])
  expect(toggleArrivalAlarmStop([0], 0)).toBeUndefined()
})

test("shows the stop that rings next", () => {
  const now = Date.now()
  const stops = [
    { train: 0, fireDate: now - MINUTE },
    { train: 1, fireDate: now + 20 * MINUTE },
  ]

  expect(getNextArrivalAlarmStop(stops, now)).toBe(stops[1])
  expect(getNextArrivalAlarmStop(stops, now + 30 * MINUTE)).toBe(stops[1])
})
