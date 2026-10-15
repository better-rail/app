import { useEffect, useState } from "react"
import { findUpcomingVoucher, useVouchersStore } from "@/models/vouchers/vouchers"
import { useRideStore } from "@/models/ride/ride"
import { findRouteVoucher } from "@/utils/helpers/voucher-helpers"
import { israelNow } from "@/utils/helpers/date-helpers"
import { useAppState } from "./use-app-state"

// Delays push the real arrival past the scheduled one, so the voucher stays a while longer
const ARRIVAL_GRACE_MS = 60 * 60 * 1000

/** The voucher the rider needs next. Kept for the whole live ride on its train, and an hour past arrival otherwise. */
export function useUpcomingVoucher() {
  const vouchers = useVouchersStore((s) => s.vouchers)
  const rideRoute = useRideStore((s) => s.route)
  const appState = useAppState()
  // Israel time, to compare against schedule timestamps on devices in other timezones
  const [now, setNow] = useState(israelNow)

  useEffect(() => {
    if (appState === "active") setNow(israelNow())
  }, [appState])

  const upcoming = findUpcomingVoucher(vouchers, now - ARRIVAL_GRACE_MS)

  useEffect(() => {
    if (!upcoming) return
    const timeout = setTimeout(() => setNow(israelNow()), upcoming.arrivalTime + ARRIVAL_GRACE_MS - israelNow() + 1000)
    return () => clearTimeout(timeout)
  }, [upcoming])

  return (rideRoute && findRouteVoucher(vouchers, rideRoute)) || upcoming
}
