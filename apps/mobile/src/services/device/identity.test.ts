import { beforeEach, expect, test } from "bun:test"

import { mockSecureStore } from "../../../test/mock-expo-secure-store"

import { clearDeviceIdentity, getDeviceIdentity, peekDeviceIdentity } from "./identity"

const keychain = mockSecureStore.items
const storeCalls = mockSecureStore.writes

beforeEach(async () => {
  await clearDeviceIdentity()
  mockSecureStore.reset()
})

test("creates a UUID device id and a 32-byte hex secret on first use", async () => {
  const identity = await getDeviceIdentity()
  expect(identity.deviceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  expect(identity.secret).toMatch(/^[0-9a-f]{64}$/)
  expect(storeCalls).toEqual([{ key: "device_identity", options: { keychainAccessible: 1 } }])
})

test("returns the same identity afterwards", async () => {
  const first = await getDeviceIdentity()
  expect(await getDeviceIdentity()).toEqual(first)
  expect(storeCalls).toHaveLength(1)
  expect(JSON.parse(keychain.get("device_identity")!)).toEqual(first)
})

test("reads an identity stored by an earlier launch instead of making a new one", async () => {
  const earlier = { deviceId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", secret: "b".repeat(64) }
  keychain.set("device_identity", JSON.stringify(earlier))
  expect(await getDeviceIdentity()).toEqual(earlier)
  expect(storeCalls).toHaveLength(0)
})

test("concurrent first calls share one identity", async () => {
  const [a, b, c] = await Promise.all([getDeviceIdentity(), getDeviceIdentity(), getDeviceIdentity()])
  expect(b).toEqual(a)
  expect(c).toEqual(a)
  expect(storeCalls).toHaveLength(1)
})

test("replaces a corrupt stored identity", async () => {
  keychain.set("device_identity", JSON.stringify({ deviceId: "x", secret: "y" }))
  const identity = await getDeviceIdentity()
  expect(identity.secret).toMatch(/^[0-9a-f]{64}$/)
  expect(JSON.parse(keychain.get("device_identity")!)).toEqual(identity)
})

test("retries after a failed keychain write instead of caching the failure", async () => {
  mockSecureStore.failNextWrite = true
  await expect(getDeviceIdentity()).rejects.toThrow("keychain unavailable")
  const identity = await getDeviceIdentity()
  expect(identity.deviceId).toBeTruthy()
})

test("clearing makes the next call create a new identity; peek never creates one", async () => {
  expect(await peekDeviceIdentity()).toBeUndefined()
  expect(keychain.size).toBe(0)

  const first = await getDeviceIdentity()
  expect(await peekDeviceIdentity()).toEqual(first)

  await clearDeviceIdentity()
  expect(await peekDeviceIdentity()).toBeUndefined()
  const second = await getDeviceIdentity()
  expect(second.deviceId).not.toBe(first.deviceId)
  expect(second.secret).not.toBe(first.secret)
})
