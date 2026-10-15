import { describe, test, expect } from "bun:test"
import type { Train } from "@/services/api"
import { findUpcomingVoucher, type Voucher } from "@/models/vouchers/vouchers"
import {
  getVoucherTrain,
  findRouteVoucher,
  isVoucherBookable,
  normalizeIsraeliMobile,
  VOUCHER_STATION_ID,
} from "./voucher-helpers"

const HOUR = 60 * 60 * 1000
const config = { bookingWindowHours: 72, lateBookingMinutes: 60 }

describe("isVoucherBookable", () => {
  const now = Date.parse("2026-10-15T12:00:00+03:00")
  const trainAt = (departureOffset: number, durationHours = 1) => ({
    departureTime: now + departureOffset,
    arrivalTime: now + departureOffset + durationHours * HOUR,
  })

  test("opens 72 hours before departure", () => {
    expect(isVoucherBookable(trainAt(72 * HOUR), config, now)).toBe(true)
    expect(isVoucherBookable(trainAt(73 * HOUR), config, now)).toBe(false)
  })

  test("stays open while the train runs and for an hour after it arrives", () => {
    expect(isVoucherBookable(trainAt(-0.5 * HOUR), config, now)).toBe(true)
    expect(isVoucherBookable(trainAt(-1.5 * HOUR), config, now)).toBe(true)
    expect(isVoucherBookable(trainAt(-2.5 * HOUR), config, now)).toBe(false)
  })
})

describe("getVoucherTrain", () => {
  const leg = (originStationId: number, destinationStationId: number) => ({ originStationId, destinationStationId }) as Train

  test("picks the leg that boards or alights at Yitzhak Navon", () => {
    const toJerusalem = leg(4600, VOUCHER_STATION_ID)
    expect(getVoucherTrain({ trains: [leg(3700, 4600), toJerusalem] })).toBe(toJerusalem)
  })

  test("ignores routes that don't touch Yitzhak Navon", () => {
    expect(getVoucherTrain({ trains: [leg(3700, 4600)] })).toBeUndefined()
  })
})

describe("normalizeIsraeliMobile", () => {
  test("accepts local and international formats", () => {
    expect(normalizeIsraeliMobile("052-865-6710")).toBe("0528656710")
    expect(normalizeIsraeliMobile("+972 52 865 6710")).toBe("0528656710")
  })

  test("rejects landlines and short numbers", () => {
    expect(normalizeIsraeliMobile("02-123-4567")).toBeNull()
    expect(normalizeIsraeliMobile("052865")).toBeNull()
  })
})

describe("upcoming vouchers", () => {
  const now = Date.parse("2026-10-15T12:00:00+03:00")
  const voucher = (trainNumber: number, departureOffset: number) =>
    ({
      trainNumber,
      departureDate: "2026-10-15",
      fromStationId: 4600,
      toStationId: VOUCHER_STATION_ID,
      departureTime: now + departureOffset,
      arrivalTime: now + departureOffset + HOUR,
      createdAt: now,
    }) as Voucher

  test("finds the earliest voucher whose train hasn't arrived", () => {
    const vouchers = [voucher(3, 5 * HOUR), voucher(1, -2 * HOUR), voucher(2, -0.5 * HOUR)]
    expect(findUpcomingVoucher(vouchers, now)?.trainNumber).toBe(2)
    expect(findUpcomingVoucher([voucher(1, -2 * HOUR)], now)).toBeUndefined()
  })

  test("matches a route by its Yitzhak Navon leg", () => {
    const route = (trainNumber: number) => ({
      trains: [
        { originStationId: 3700, destinationStationId: 4600, trainNumber, departureTime: now },
        { originStationId: 4600, destinationStationId: VOUCHER_STATION_ID, trainNumber: 2, departureTime: now },
      ] as Train[],
    })
    expect(findRouteVoucher([voucher(2, 0)], route(1))?.trainNumber).toBe(2)
    expect(findRouteVoucher([voucher(1, 0)], route(1))).toBeUndefined()
  })

  test("doesn't match a voucher ordered for other stations on the same train", () => {
    const route = {
      trains: [
        { originStationId: 3700, destinationStationId: VOUCHER_STATION_ID, trainNumber: 2, departureTime: now },
      ] as Train[],
    }
    expect(findRouteVoucher([voucher(2, 0)], route)).toBeUndefined()
  })
})
