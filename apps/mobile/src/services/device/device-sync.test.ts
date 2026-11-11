import { afterAll, beforeEach, expect, spyOn, test } from "bun:test"
import AsyncStorage from "@react-native-async-storage/async-storage"

import { mockSecureStore } from "../../../test/mock-expo-secure-store"
import { MOCK_PUSH_TOKEN } from "../../../test/mock-expo-notifications"

// The shared AsyncStorage mock keeps nothing; this test needs what the sync saved.
const saved = new Map<string, string>()
const asyncStorage = AsyncStorage as unknown as Record<string, ReturnType<typeof spyOn>>
asyncStorage.getItem.mockImplementation(async (key: string) => saved.get(key) ?? null)
asyncStorage.setItem.mockImplementation(async (key: string, value: string) => void saved.set(key, value))
asyncStorage.removeItem.mockImplementation(async (key: string) => void saved.delete(key))
afterAll(() => {
  for (const name of ["getItem", "setItem", "removeItem"]) asyncStorage[name].mockRestore?.()
})

const { useRecurringRidesStore } = await import("@/models/recurring-rides/recurring-rides")
const { deviceApi } = await import("@/services/api/device-api")
const { clearDeviceIdentity, peekDeviceIdentity } = await import("@/services/device/identity")
const { syncDevice } = await import("./device-sync")

const syncSpy = spyOn(deviceApi, "syncDevice").mockResolvedValue(undefined)
const deleteSpy = spyOn(deviceApi, "deleteDevice").mockResolvedValue(undefined)

const ride = {
  id: "0b8d6c3e-1f2a-4b5c-9d8e-7f6a5b4c3d2e",
  originId: 3700,
  destinationId: 3500,
  departureTime: "07:45",
  days: [0, 1, 2, 3, 4],
  leadMinutes: 10,
  mode: "notify" as const,
  enabled: true,
  skipDates: [],
}

beforeEach(async () => {
  await clearDeviceIdentity()
  mockSecureStore.reset()
  saved.clear()
  useRecurringRidesStore.setState({ rides: [] })
  syncSpy.mockClear()
  deleteSpy.mockClear()
})

test("a device without recurring rides never talks to the server nor gets an identity", async () => {
  await syncDevice()
  expect(syncSpy).not.toHaveBeenCalled()
  expect(deleteSpy).not.toHaveBeenCalled()
  expect(await peekDeviceIdentity()).toBeUndefined()
})

test("rides sync once, an unchanged state isn't sent again", async () => {
  useRecurringRidesStore.setState({ rides: [ride] })
  // The real syncDevice creates the identity on its first call.
  syncSpy.mockImplementation(async () => {
    const { getDeviceIdentity } = await import("@/services/device/identity")
    await getDeviceIdentity()
  })

  await syncDevice()
  await syncDevice()
  expect(syncSpy).toHaveBeenCalledTimes(1)
  expect(syncSpy.mock.calls[0][0]).toMatchObject({ tokens: { apns: MOCK_PUSH_TOKEN }, recurringRides: [ride] })

  useRecurringRidesStore.setState({ rides: [{ ...ride, leadMinutes: 15 }] })
  await syncDevice()
  expect(syncSpy).toHaveBeenCalledTimes(2)
})
