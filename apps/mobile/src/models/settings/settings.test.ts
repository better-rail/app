import { test, expect } from "bun:test"
import { useSettingsStore, hydrateSettingsStore } from "./settings"

test("can be created with default state", () => {
  const state = useSettingsStore.getState()

  expect(state).toBeTruthy()
  expect(state.profileCode).toBe(1)
  expect(state.hideSlowTrains).toBe(false)
})

test("migrates hideCollectorTrains to hideSlowTrains", () => {
  hydrateSettingsStore({ hideCollectorTrains: true })

  const state = useSettingsStore.getState()
  expect(state.hideSlowTrains).toBe(true)
})
