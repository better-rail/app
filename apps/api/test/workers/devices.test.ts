/**
 * devices.test.ts — /device on workerd against the real DeviceDO: register, sync, auth and delete.
 */
import { SELF, env, runInDurableObject } from "cloudflare:test"
import { describe, expect, it } from "vitest"

import type { DeviceRecord } from "../../src/types/device"

const url = "https://api.test/api/v1/device"
const secret = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")

const state = (overrides: Record<string, unknown> = {}) => ({
  platform: "ios",
  locale: "he",
  appVersion: "3.2.0",
  tokens: { pushToStart: "pts-token", apns: "apns-token" },
  supportsPushToStart: true,
  recurringRides: [
    {
      id: crypto.randomUUID(),
      originId: 3700,
      destinationId: 3500,
      departureTime: "07:45",
      days: [0, 1, 2, 3, 4],
      leadMinutes: 10,
      mode: "auto",
      enabled: true,
      skipDates: [],
    },
  ],
  ...overrides,
})

const call = (method: string, deviceId: string, deviceSecret: string, body?: unknown) =>
  SELF.fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-device-id": deviceId, authorization: `Bearer ${deviceSecret}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const record = (deviceId: string) =>
  runInDurableObject(env.DEVICES.getByName(deviceId), (_instance, ctx) => ctx.storage.get<DeviceRecord>("device"))

describe("device sync", () => {
  it("registers, replaces, guards and deletes a device's state", async () => {
    const deviceId = crypto.randomUUID()
    const deviceSecret = secret()

    expect((await call("PUT", deviceId, deviceSecret, state())).status).toBe(201)
    expect((await record(deviceId))?.tokens).toEqual({ pushToStart: "pts-token", apns: "apns-token" })

    expect((await call("PUT", deviceId, deviceSecret, state({ tokens: {}, recurringRides: [] }))).status).toBe(200)
    expect(await record(deviceId)).toMatchObject({ tokens: {}, recurringRides: [] })

    // Another secret for the same id: the same 404 as an unknown route, and nothing changes.
    expect((await call("PUT", deviceId, secret(), state())).status).toBe(404)
    expect((await call("DELETE", deviceId, secret())).status).toBe(404)
    expect((await record(deviceId))?.recurringRides).toEqual([])

    expect((await call("DELETE", deviceId, deviceSecret)).status).toBe(200)
    expect(await record(deviceId)).toBeUndefined()
    expect((await call("DELETE", deviceId, deviceSecret)).status).toBe(404)
  })

  it("answers without credentials like an unknown route", async () => {
    const response = await SELF.fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" })
    expect(response.status).toBe(404)
  })
})
