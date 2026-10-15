import type { RouteItem, Train, VoucherConfig } from "@/services/api"
import { findVouchers, type Voucher } from "@/models/vouchers/vouchers"
import { formatDateForAPI, israelNow } from "./date-helpers"

/** Jerusalem – Yitzhak Navon, the only station that requires an entry voucher */
export const VOUCHER_STATION_ID = 680

/** The leg of a route that boards or alights at Yitzhak Navon. */
export function getVoucherTrain(route: Pick<RouteItem, "trains">): Train | undefined {
  return route.trains.find(
    (train) => train.originStationId === VOUCHER_STATION_ID || train.destinationStationId === VOUCHER_STATION_ID,
  )
}

/** The voucher the rider holds for the route's Yitzhak Navon leg, if any. */
export function findRouteVoucher(vouchers: Voucher[], route: Pick<RouteItem, "trains">) {
  const train = getVoucherTrain(route)
  return train ? findVouchers(vouchers, train.trainNumber, getVoucherDate(train))[0] : undefined
}

/** The date Israel Rail keys a train's vouchers by (yyyy-MM-dd). */
export function getVoucherDate(train: Pick<Train, "departureTime">) {
  return formatDateForAPI(train.departureTime)[0]
}

/**
 * Mirrors rail.co.il: a voucher can be booked from `bookingWindowHours` before departure
 * until `lateBookingMinutes` after arrival.
 */
export function isVoucherBookable(
  train: Pick<Train, "departureTime" | "arrivalTime">,
  config: Pick<VoucherConfig, "bookingWindowHours" | "lateBookingMinutes">,
  now = israelNow(),
) {
  const opensAt = train.departureTime - config.bookingWindowHours * 60 * 60 * 1000
  const closesAt = train.arrivalTime + config.lateBookingMinutes * 60 * 1000
  return now >= opensAt && now <= closesAt
}

/** Normalizes an Israeli mobile number to the 05XXXXXXXX form Israel Rail expects, or null if it isn't one. */
export function normalizeIsraeliMobile(input: string) {
  let digits = input.replace(/\D/g, "")
  if (digits.startsWith("972")) digits = "0" + digits.slice(3)
  return /^05\d{8}$/.test(digits) ? digits : null
}
