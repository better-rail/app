import { beforeEach, expect, spyOn, test } from "bun:test"

import { mockSecureStore } from "../../../test/mock-expo-secure-store"
import { MOCK_PUSH_TOKEN } from "../../../test/mock-expo-notifications"
import { useRecurringRidesStore } from "@/models/recurring-rides/recurring-rides"
import { deviceApi } from "@/services/api/device-api"
import { clearDeviceIdentity, getDeviceIdentity, peekDeviceIdentity } from "@/services/device/identity"
import * as storage from "@/utils/storage"
import { syncDevice } from "./device-sync"

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
  storage.remove("device_last_sync")
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
