import { beforeEach, expect, test } from "bun:test"

import { mockSecureStore } from "../../../test/mock-expo-secure-store"

import { clearDeviceIdentity, getDeviceIdentity } from "./identity"

beforeEach(async () => {
  await clearDeviceIdentity()
  mockSecureStore.reset()
})

test("creates one identity, kept on this device only, and returns it afterwards", async () => {
  const identity = await getDeviceIdentity()
  expect(identity.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(identity.secret).toMatch(/^[0-9a-f]{64}$/)
  expect(await getDeviceIdentity()).toEqual(identity)
  expect(mockSecureStore.writes).toEqual([{ key: "device_identity", options: { keychainAccessible: 1 } }])
})

test("concurrent first calls share one identity", async () => {
  const [a, b] = await Promise.all([getDeviceIdentity(), getDeviceIdentity()])
  expect(b).toEqual(a)
  expect(mockSecureStore.writes).toHaveLength(1)
})
