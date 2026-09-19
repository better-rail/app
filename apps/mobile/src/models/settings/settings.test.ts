import { test, expect, beforeEach } from "bun:test"
import {
  useSettingsStore,
  hydrateSettingsStore,
  getSettingsSnapshot,
  resetSettingsStore,
  filterRouteDataByMaxChanges,
} from "./settings"

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

test("station alerts: adding, narrowing to lines and days, removing", () => {
  const store = useSettingsStore.getState()
  store.setStationAlert("3700")
  store.setStationAlert("3500", { lineIds: ["1", "2"] })
  expect(useSettingsStore.getState().stationAlerts).toEqual([
    { stationId: "3700", lineIds: null, dayTypes: null },
    { stationId: "3500", lineIds: ["1", "2"], dayTypes: null },
  ])

  // Changing one choice keeps the other and the station's place; an empty set means every one.
  store.setStationAlert("3700", { dayTypes: ["night", "night"] })
  store.setStationAlert("3700", { lineIds: ["7"] })
  store.setStationAlert("3500", { lineIds: [] })
  expect(useSettingsStore.getState().stationAlerts).toEqual([
    { stationId: "3700", lineIds: ["7"], dayTypes: ["night"] },
    { stationId: "3500", lineIds: null, dayTypes: null },
  ])

  store.removeStationAlert("3700")
  expect(useSettingsStore.getState().stationAlerts).toEqual([{ stationId: "3500", lineIds: null, dayTypes: null }])
})

test("station alerts survive persistence and the old per-station list migrates to every line", () => {
  useSettingsStore.getState().setStationAlert("3700", { lineIds: ["1"], dayTypes: ["weekday"] })
  useSettingsStore.getState().setStationAlertsRegistered(true)
  const snapshot = getSettingsSnapshot(useSettingsStore.getState())
  resetSettingsStore()
  hydrateSettingsStore(snapshot)
  expect(useSettingsStore.getState().stationAlerts).toEqual([{ stationId: "3700", lineIds: ["1"], dayTypes: ["weekday"] }])
  expect(useSettingsStore.getState().stationAlertsRegistered).toBe(true)

  resetSettingsStore()
  hydrateSettingsStore({ stationsNotifications: ["3700", "3500", "3700"] })
  expect(useSettingsStore.getState().stationAlerts).toEqual([
    { stationId: "3700", lineIds: null, dayTypes: null },
    { stationId: "3500", lineIds: null, dayTypes: null },
  ])

  resetSettingsStore()
  hydrateSettingsStore({
    stationAlerts: [{ stationId: "3700", lineIds: [], dayTypes: ["night", "sometime"] }, { lineIds: null }, "junk"],
  })
  expect(useSettingsStore.getState().stationAlerts).toEqual([{ stationId: "3700", lineIds: null, dayTypes: ["night"] }])
})

test("delay guards: adding, changing the threshold, removing, persisting", () => {
  const store = useSettingsStore.getState()
  const guard = {
    trainNumber: 230,
    originStationId: "3500",
    destinationStationId: "5900",
    departureTime: "08:30",
    thresholdMinutes: 3,
  }
  store.setDelayGuard(guard)
  store.setDelayGuard({ ...guard, trainNumber: 232, departureTime: "09:00" })
  store.setDelayGuard({ ...guard, thresholdMinutes: 5 })
  expect(useSettingsStore.getState().delayGuards).toEqual([
    { ...guard, thresholdMinutes: 5 },
    { ...guard, trainNumber: 232, departureTime: "09:00" },
  ])

  const snapshot = getSettingsSnapshot(useSettingsStore.getState())
  resetSettingsStore()
  hydrateSettingsStore(snapshot)
  expect(useSettingsStore.getState().delayGuards).toHaveLength(2)

  useSettingsStore.getState().removeDelayGuard("230@3500")
  expect(useSettingsStore.getState().delayGuards).toEqual([{ ...guard, trainNumber: 232, departureTime: "09:00" }])

  resetSettingsStore()
  hydrateSettingsStore({ delayGuards: [{ ...guard, thresholdMinutes: 99 }, { trainNumber: "x" }, guard] })
  expect(useSettingsStore.getState().delayGuards).toEqual([{ ...guard, thresholdMinutes: 3 }])
})
