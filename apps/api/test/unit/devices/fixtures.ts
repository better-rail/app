import type { DeviceState } from "../../../src/types/device"
import type { DeviceStorage } from "../../../src/devices/store"

/** An in-memory stand-in for a Durable Object's storage. */
export class MemoryStorage implements DeviceStorage {
  readonly data = new Map<string, unknown>()
  async get<T>(key: string) {
    return structuredClone(this.data.get(key)) as T | undefined
  }
  async put<T>(key: string, value: T) {
    this.data.set(key, structuredClone(value))
  }
  async deleteAll() {
    this.data.clear()
  }
}

export const recurringRide = (overrides: Record<string, unknown> = {}) => ({
  id: crypto.randomUUID(),
  originId: 3700,
  destinationId: 3500,
  departureTime: "07:45",
  days: [0, 1, 2, 3, 4],
  leadMinutes: 10,
  mode: "auto" as const,
  enabled: true,
  skipDates: ["2026-12-25"],
  ...overrides,
})

export const deviceState = (overrides: Partial<DeviceState> = {}): DeviceState =>
  ({
    platform: "ios",
    locale: "he",
    appVersion: "3.2.0",
    tokens: { pushToStart: "push-to-start-token-value", apns: "apns-token-value" },
    supportsPushToStart: true,
    recurringRides: [recurringRide()],
    ...overrides,
  }) as DeviceState

/** 32 random bytes, hex encoded, like the app's secret. */
export const randomSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")
