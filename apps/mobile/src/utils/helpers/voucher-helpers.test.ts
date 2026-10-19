import { test, expect } from "bun:test"
import type { Train } from "@/services/api"
import type { Voucher } from "@/models/vouchers/vouchers"
import { findRouteVoucher, isVoucherBookable, VOUCHER_STATION_ID } from "./voucher-helpers"

const HOUR = 60 * 60 * 1000
const now = Date.parse("2026-10-15T12:00:00+03:00")

test("vouchers are bookable from 72 hours before departure until an hour after arrival", () => {
  const config = { bookingWindowHours: 72, lateBookingMinutes: 60 }

  expect(isVoucherBookable({ departureTime: now + 73 * HOUR, arrivalTime: now + 74 * HOUR }, config, now)).toBe(false)
  expect(isVoucherBookable({ departureTime: now + 72 * HOUR, arrivalTime: now + 73 * HOUR }, config, now)).toBe(true)
  expect(isVoucherBookable({ departureTime: now - 1.5 * HOUR, arrivalTime: now - 0.5 * HOUR }, config, now)).toBe(true)
  expect(isVoucherBookable({ departureTime: now - 2.5 * HOUR, arrivalTime: now - 1.5 * HOUR }, config, now)).toBe(false)
})

test("a voucher matches the same train's Yitzhak Navon leg from any station", () => {
  const voucher = {
    trainNumber: 2,
    departureDate: "2026-10-15",
    fromStationId: 4600,
    toStationId: VOUCHER_STATION_ID,
  } as Voucher
  const leg = { trainNumber: 2, departureTime: now, destinationStationId: VOUCHER_STATION_ID }

  expect(findRouteVoucher([voucher], { trains: [{ ...leg, originStationId: 4600 } as Train] })).toBe(voucher)
  // Same train, boarding at a different station
  expect(findRouteVoucher([voucher], { trains: [{ ...leg, originStationId: 3700 } as Train] })).toBe(voucher)
  // Another train, or the same train number on another day
  expect(findRouteVoucher([voucher], { trains: [{ ...leg, originStationId: 4600, trainNumber: 3 } as Train] })).toBeUndefined()
  expect(
    findRouteVoucher([voucher], { trains: [{ ...leg, originStationId: 4600, departureTime: now + 24 * HOUR } as Train] }),
  ).toBeUndefined()
})
