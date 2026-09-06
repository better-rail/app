import { test, expect, beforeEach } from "bun:test"
import { useSettingsStore, hydrateSettingsStore, getSettingsSnapshot, resetSettingsStore, filterRouteDataByMaxChanges } from "./settings"

beforeEach(resetSettingsStore)

test("can be created with default state", () => {
  const state = useSettingsStore.getState()

  expect(state).toBeTruthy()
  expect(state.profileCode).toBe(1)
  expect(state.hideSlowTrains).toBe(false)
  expect(state.maxChanges).toBe(null)
})

test("migrates hideCollectorTrains to hideSlowTrains", () => {
  hydrateSettingsStore({ hideCollectorTrains: true })

  const state = useSettingsStore.getState()
  expect(state.hideSlowTrains).toBe(true)
})

test("existing tip totals survive migration without a transaction ledger", () => {
  hydrateSettingsStore({ totalTip: 50 })
  expect(useSettingsStore.getState().totalTip).toBe(50)
  expect(useSettingsStore.getState().recordedTipTransactionIds).toEqual([])
})

test("transaction IDs survive persistence and prevent recounting after relaunch", () => {
  useSettingsStore.getState().recordTip("tip-1", 10)
  const snapshot = getSettingsSnapshot(useSettingsStore.getState())
  resetSettingsStore()
  hydrateSettingsStore(snapshot)

  useSettingsStore.getState().recordTip("tip-1", 10)
  useSettingsStore.getState().recordTip("tip-2", 20)

  expect(useSettingsStore.getState().totalTip).toBe(30)
  expect(useSettingsStore.getState().recordedTipTransactionIds).toEqual(["tip-1", "tip-2"])
})

test("filterRouteDataByMaxChanges drops routes over the limit and orphaned date headers", () => {
  const direct = { trains: [1] }
  const oneChange = { trains: [1, 2] }
  const twoChanges = { trains: [1, 2, 3] }
  const data = ["Mon", direct, oneChange, "Tue", twoChanges, "Wed", oneChange]

  expect(filterRouteDataByMaxChanges(data, null)).toBe(data)
  expect(filterRouteDataByMaxChanges(data, 0)).toEqual(["Mon", direct])
  expect(filterRouteDataByMaxChanges(data, 1)).toEqual(["Mon", direct, oneChange, "Wed", oneChange])
})
