import type { RouteItem, Train, VoucherConfig } from "@/services/api"
import { findVouchers, type Voucher } from "@/models/vouchers/vouchers"
import { translate } from "@/i18n"
import { formatDateForAPI, israelNow } from "./date-helpers"

/** Jerusalem – Yitzhak Navon, the only station that requires an entry voucher */
export const VOUCHER_STATION_ID = 680

/** "Voucher to Jerusalem" or "from Jerusalem", by where the voucher's leg departs. */
export function getVoucherTitle(fromStationId: number | string | undefined) {
  return translate(Number(fromStationId) === VOUCHER_STATION_ID ? "voucher.titleFrom" : "voucher.titleTo") ?? ""
}

/** The leg of a route that boards or alights at Yitzhak Navon. */
export function getVoucherTrain(route: Pick<RouteItem, "trains">): Train | undefined {
  return route.trains.find(
    (train) => train.originStationId === VOUCHER_STATION_ID || train.destinationStationId === VOUCHER_STATION_ID,
  )
}

/** The voucher the rider holds for the route's Yitzhak Navon leg, if any. */
export function findRouteVoucher(vouchers: Voucher[], route: Pick<RouteItem, "trains">) {
  const train = getVoucherTrain(route)
  return train ? findVouchers(vouchers, getVoucherTrip(train))[0] : undefined
}

/** The trip a voucher for this train leg is ordered for. */
export function getVoucherTrip(train: Pick<Train, "trainNumber" | "departureTime" | "originStationId" | "destinationStationId">) {
  return {
    trainNumber: train.trainNumber,
    departureDate: getVoucherDate(train),
    fromStationId: train.originStationId,
    toStationId: train.destinationStationId,
  }
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

/** The code in Israel Rail's SMS: exactly `length` digits, not part of a longer number. Null when there's none. */
export function extractVoucherCode(message: string, length: number) {
  return new RegExp(`(?:^|\\D)(\\d{${length}})(?!\\d)`).exec(message)?.[1] ?? null
}
