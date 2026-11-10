import { describe, expect, it } from "bun:test"

import { DeviceIdSchema, DeviceSecretSchema, DeviceStateSchema, RecurringRideSchema } from "../../../src/types/device"
import { deviceState, randomSecret, recurringRide } from "./fixtures"

describe("device state schema", () => {
  it("accepts a well-formed state", () => {
    expect(DeviceStateSchema.safeParse(deviceState()).success).toBe(true)
    expect(DeviceStateSchema.safeParse(deviceState({ tokens: {}, recurringRides: [] })).success).toBe(true)
    expect(
      DeviceStateSchema.safeParse(deviceState({ platform: "android", tokens: { fcm: "fcm-token" }, supportsPushToStart: false }))
        .success,
    ).toBe(true)
  })

  it("rejects unknown platforms, locales and empty tokens", () => {
    expect(DeviceStateSchema.safeParse({ ...deviceState(), platform: "web" }).success).toBe(false)
    expect(DeviceStateSchema.safeParse({ ...deviceState(), locale: "fr" }).success).toBe(false)
    expect(DeviceStateSchema.safeParse({ ...deviceState(), tokens: { apns: "" } }).success).toBe(false)
    expect(DeviceStateSchema.safeParse({ ...deviceState(), tokens: { apns: "x".repeat(2000) } }).success).toBe(false)
    expect(DeviceStateSchema.safeParse({ ...deviceState(), appVersion: "" }).success).toBe(false)
  })

  it("bounds the recurring rides and rejects duplicate ids", () => {
    const eleven = Array.from({ length: 11 }, () => recurringRide())
    expect(DeviceStateSchema.safeParse({ ...deviceState(), recurringRides: eleven }).success).toBe(false)

    const ride = recurringRide()
    expect(DeviceStateSchema.safeParse({ ...deviceState(), recurringRides: [ride, ride] }).success).toBe(false)
  })
})

describe("recurring ride schema", () => {
  const valid = (overrides: Record<string, unknown>) => RecurringRideSchema.safeParse(recurringRide(overrides)).success

  it("accepts a well-formed ride, with or without a via station", () => {
    expect(valid({})).toBe(true)
    expect(valid({ viaStationId: 4600, mode: "notify", enabled: false, skipDates: [] })).toBe(true)
  })

  it("checks the stations exist and differ", () => {
    expect(valid({ originId: 1 })).toBe(false)
    expect(valid({ destinationId: 1 })).toBe(false)
    expect(valid({ viaStationId: 1 })).toBe(false)
    expect(valid({ destinationId: 3700 })).toBe(false)
  })

  it("takes the departure time as HH:mm", () => {
    expect(valid({ departureTime: "00:00" })).toBe(true)
    expect(valid({ departureTime: "23:59" })).toBe(true)
    expect(valid({ departureTime: "24:00" })).toBe(false)
    expect(valid({ departureTime: "7:45" })).toBe(false)
    expect(valid({ departureTime: "07:45:00" })).toBe(false)
  })

  it("takes unique weekdays 0-6", () => {
    expect(valid({ days: [6] })).toBe(true)
    expect(valid({ days: [] })).toBe(false)
    expect(valid({ days: [7] })).toBe(false)
    expect(valid({ days: [1, 1] })).toBe(false)
    expect(valid({ days: [1.5] })).toBe(false)
  })

  it("checks the lead time, mode, id and skip dates", () => {
    expect(valid({ leadMinutes: -1 })).toBe(false)
    expect(valid({ leadMinutes: 500 })).toBe(false)
    expect(valid({ mode: "sometimes" })).toBe(false)
    expect(valid({ id: "not-a-uuid" })).toBe(false)
    expect(valid({ skipDates: ["2026-02-30"] })).toBe(false)
    expect(valid({ skipDates: ["25/12/2026"] })).toBe(false)
    expect(valid({ skipDates: Array.from({ length: 61 }, () => "2026-12-25") })).toBe(false)
  })
})

describe("device credentials", () => {
  it("takes a UUID device id and a 64-hex-char secret", () => {
    expect(DeviceIdSchema.safeParse(crypto.randomUUID()).success).toBe(true)
    expect(DeviceIdSchema.safeParse("device-1").success).toBe(false)
    expect(DeviceSecretSchema.safeParse(randomSecret()).success).toBe(true)
    expect(DeviceSecretSchema.safeParse(randomSecret().slice(1)).success).toBe(false)
    expect(DeviceSecretSchema.safeParse(randomSecret().toUpperCase()).success).toBe(false)
  })
})
