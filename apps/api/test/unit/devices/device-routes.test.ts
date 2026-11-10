/**
 * The /device routes over an in-memory DeviceDO: registration, auth, replace-on-sync and delete.
 */
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test"
import { Elysia } from "elysia"

import { bindRuntime, type Env } from "../../../src/runtime"
import { deviceRoutes } from "../../../src/routes/devices"
import { deleteDeviceState, hashSecret, readDeviceRecord, syncDeviceState } from "../../../src/devices/store"
import type { DeviceRecord, DeviceState } from "../../../src/types/device"
import { MemoryStorage, deviceState, randomSecret, recurringRide } from "./fixtures"

const app = new Elysia({ aot: false }).group("/api/v1", (api) => api.use(deviceRoutes))
const url = "https://api.test/api/v1/device"

// One in-memory object per device id, behind the same RPC surface DeviceDO exposes.
const objects = new Map<string, MemoryStorage>()
const storageFor = (deviceId: string) => {
  if (!objects.has(deviceId)) objects.set(deviceId, new MemoryStorage())
  return objects.get(deviceId)!
}
let failing = false

beforeEach(() => {
  objects.clear()
  failing = false
  bindRuntime({
    DEVICES: {
      getByName: (deviceId: string) => ({
        sync: (secretHash: string, state: DeviceState) => {
          if (failing) throw new Error("object unavailable")
          return syncDeviceState(storageFor(deviceId), secretHash, state)
        },
        remove: (secretHash: string) => {
          if (failing) throw new Error("object unavailable")
          return deleteDeviceState(storageFor(deviceId), secretHash)
        },
      }),
    },
  } as unknown as Env)
})

const headers = (deviceId?: string, secret?: string) => ({
  "content-type": "application/json",
  ...(deviceId !== undefined && { "x-device-id": deviceId }),
  ...(secret !== undefined && { authorization: `Bearer ${secret}` }),
})

const put = (deviceId: string | undefined, secret: string | undefined, body: unknown = deviceState()) =>
  app.handle(new Request(url, { method: "PUT", headers: headers(deviceId, secret), body: JSON.stringify(body) }))

const del = (deviceId: string | undefined, secret: string | undefined) =>
  app.handle(new Request(url, { method: "DELETE", headers: headers(deviceId, secret) }))

const stored = (deviceId: string) => readDeviceRecord(storageFor(deviceId)) as Promise<DeviceRecord | undefined>

describe("PUT /device", () => {
  it("registers a device on its first sync and keeps only the secret's hash", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()

    const response = await put(deviceId, secret)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ success: true })

    const record = await stored(deviceId)
    expect(record?.secretHash).toBe(await hashSecret(secret))
    expect(JSON.stringify(record)).not.toContain(secret)
    expect(record?.recurringRides).toHaveLength(1)
    expect(record?.createdAt).toBe(record!.lastSyncAt)
  })

  it("replaces the whole state on a later sync with the same secret", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()
    await put(deviceId, secret)
    const first = await stored(deviceId)

    const next = deviceState({
      locale: "en" as DeviceState["locale"],
      tokens: { apns: "new-apns-token" },
      recurringRides: [recurringRide({ mode: "notify" }), recurringRide({ departureTime: "18:10" })],
    })
    const response = await put(deviceId, secret, next)
    expect(response.status).toBe(200)

    const record = await stored(deviceId)
    expect(record).toMatchObject({ ...next, createdAt: first!.createdAt })
    // Replaced, not merged: the push-to-start token the device dropped is gone.
    expect(record?.tokens).toEqual({ apns: "new-apns-token" })
    expect(record!.lastSyncAt).toBeGreaterThanOrEqual(first!.lastSyncAt)
  })

  it("answers a wrong secret like an unknown route and leaves the state alone", async () => {
    const deviceId = crypto.randomUUID()
    await put(deviceId, randomSecret())
    const before = await stored(deviceId)

    const response = await put(deviceId, randomSecret(), deviceState({ recurringRides: [] }))
    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
    expect(await stored(deviceId)).toEqual(before)
  })

  it("answers missing or malformed credentials with 404", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()
    for (const response of await Promise.all([
      put(undefined, secret),
      put(deviceId, undefined),
      put(undefined, undefined),
      put("not-a-uuid", secret),
      put(deviceId, "short"),
    ])) {
      expect(response.status).toBe(404)
    }
    expect(objects.size).toBe(0)
  })

  it("rejects an invalid body without touching the object", async () => {
    const deviceId = crypto.randomUUID()
    const response = await put(deviceId, randomSecret(), { ...deviceState(), platform: "web" })
    expect(response.status).toBe(400)
    expect(objects.size).toBe(0)
  })

  it("treats the device id case-insensitively", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()
    await put(deviceId, secret)
    expect((await put(deviceId.toUpperCase(), secret)).status).toBe(200)
    expect(objects.size).toBe(1)
  })

  it("answers 500 when the object fails, without logging the device's credentials", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()
    const consoleError = spyOn(console, "error").mockImplementation(() => undefined)
    failing = true
    try {
      const response = await put(deviceId, secret)
      expect(response.status).toBe(500)
      const printed = consoleError.mock.calls.flat().join(" ")
      expect(printed).toContain("Failed to sync device state")
      expect(printed).not.toContain(deviceId)
      expect(printed).not.toContain(secret)
    } finally {
      consoleError.mockRestore()
    }
  })
})

describe("DELETE /device", () => {
  it("wipes the device's state with the right secret", async () => {
    const deviceId = crypto.randomUUID()
    const secret = randomSecret()
    await put(deviceId, secret)

    const response = await del(deviceId, secret)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(storageFor(deviceId).data.size).toBe(0)

    // A deleted device can register again, under a new secret.
    expect((await put(deviceId, randomSecret())).status).toBe(201)
  })

  it("answers a wrong secret and an unknown device the same way", async () => {
    const deviceId = crypto.randomUUID()
    await put(deviceId, randomSecret())

    const wrongSecret = await del(deviceId, randomSecret())
    const unknown = await del(crypto.randomUUID(), randomSecret())
    expect(wrongSecret.status).toBe(404)
    expect(unknown.status).toBe(404)
    expect(await wrongSecret.text()).toBe(await unknown.text())
    expect(await stored(deviceId)).toBeDefined()
  })

  it("answers missing credentials with 404", async () => {
    expect((await del(undefined, randomSecret())).status).toBe(404)
    expect((await del(crypto.randomUUID(), undefined)).status).toBe(404)
  })
})

afterEach(() => {
  failing = false
})
