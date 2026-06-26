import { test, expect } from "bun:test"
import { useRoutePlanStore, getRoutePlanSnapshot } from "./route-plan"

test("can be created with default state", () => {
  const state = useRoutePlanStore.getState()

  expect(state.origin).toBeUndefined()
  expect(state.destination).toBeUndefined()
  expect(state.date).toBeInstanceOf(Date)
  expect(state.dateType).toBe("departure")
})

test("snapshot excludes date and dateType", () => {
  const origin = {
    name: "ירושלים - יצחק נבון",
    id: "680",
  }

  const destination = {
    name: "הרצליה",
    id: "3500",
  }

  useRoutePlanStore.setState({ origin, destination })

  const snapshot = getRoutePlanSnapshot(useRoutePlanStore.getState())

  expect(snapshot).toEqual({ origin, destination })
  expect(snapshot).not.toHaveProperty("date")
  expect(snapshot).not.toHaveProperty("dateType")
})
