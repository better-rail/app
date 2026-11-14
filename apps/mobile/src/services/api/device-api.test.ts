import { beforeEach, expect, test } from "bun:test"
import { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios"

import { mockSecureStore } from "../../../test/mock-expo-secure-store"
import { clearDeviceIdentity } from "@/services/device/identity"
import { DeviceApi, DeviceApiError, type DeviceSyncState } from "./device-api"

const identity = {
  deviceId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b",
  secret: "a".repeat(64),
}
/** A device that already has an identity in its keychain. */
const storeIdentity = () => mockSecureStore.items.set("device_identity", JSON.stringify(identity))

const state: DeviceSyncState = {
  platform: "ios",
  locale: "he",
  appVersion: "3.2.0",
  tokens: { pushToStart: "pts", apns: "apns" },
  supportsPushToStart: true,
  recurringRides: [
    {
      id: "0b8d6c3e-1f2a-4b5c-9d8e-7f6a5b4c3d2e",
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
}

type Sent = { method?: string; url?: string; baseURL?: string; params?: unknown; headers: Record<string, unknown>; data: unknown }
const sent: Sent[] = []
let respond: (config: AxiosRequestConfig) => { status: number; data?: unknown } = () => ({ status: 200, data: { success: true } })

const api = new DeviceApi()
// Stand in for the network: record what would be sent and answer with `respond`.
api.axiosInstance.defaults.adapter = async (config) => {
  const headers = Object.fromEntries(Object.entries(config.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]))
  sent.push({
    method: config.method,
    url: config.url,
    baseURL: config.baseURL,
    params: config.params,
    headers,
    data: config.data ? JSON.parse(config.data) : undefined,
  })
  const { status, data } = respond(config)
  const response = { status, data, statusText: "", headers: {}, config } as AxiosResponse
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config as never, null, response)
  }
  return response
}

beforeEach(async () => {
  sent.length = 0
  await clearDeviceIdentity()
  mockSecureStore.reset()
  respond = () => ({ status: 200, data: { success: true } })
})

const fullUrl = (request: Sent) => `${request.baseURL}${request.url}`

test("syncDevice PUTs the whole state with the identity in headers only", async () => {
  storeIdentity()
  await api.syncDevice(state)

  expect(sent).toHaveLength(1)
  const [request] = sent
  expect(request.method).toBe("put")
  expect(request.url).toBe("/device")
  expect(request.data).toEqual(state)
  expect(request.headers["x-device-id"]).toBe(identity.deviceId)
  expect(request.headers.authorization).toBe(`Bearer ${identity.secret}`)
  // Never in the URL or the query string.
  expect(request.params).toBeUndefined()
  expect(fullUrl(request)).not.toContain(identity.deviceId)
  expect(fullUrl(request)).not.toContain(identity.secret)
})

test("a failed sync throws a DeviceApiError without the credentials", async () => {
  storeIdentity()
  respond = () => ({ status: 404 })
  const error = await api.syncDevice(state).catch((e: unknown) => e)

  expect(error).toBeInstanceOf(DeviceApiError)
  expect((error as InstanceType<typeof DeviceApiError>).status).toBe(404)
  // Nothing a crash report could serialize carries the id or the secret (an AxiosError's config would).
  const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error))
  expect(serialized).not.toContain(identity.deviceId)
  expect(serialized).not.toContain(identity.secret)
  expect(Object.keys(error as object).sort()).toEqual(["name", "status"])
})
