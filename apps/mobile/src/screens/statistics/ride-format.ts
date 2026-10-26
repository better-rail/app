import { translate, userLocale } from "@/i18n"
import type { RideRecord } from "@/models"
import type { HistoryMetric } from "./compute-stats"

const formatNumber = (value: number) => Math.round(value).toLocaleString(userLocale)

export function formatMetric(metric: HistoryMetric, value: number | undefined) {
  if (value === undefined) return "–"
  if (metric === "onTime") return `${Math.round(value)}%`
  if (metric === "hours" && value > 0 && value < 10) return value.toFixed(1)
  return formatNumber(value)
}

export function rideDuration(ride: RideRecord) {
  const minutes = Math.max(0, Math.round((ride.arrivalTime - ride.departureTime) / 60000))
  return minutes < 60
    ? translate("statistics.minutesShort", { count: minutes })
    : translate("statistics.hoursMinutesShort", { hours: Math.floor(minutes / 60), minutes: minutes % 60 })
}

export function rideDistance(ride: RideRecord) {
  const distance = ride.distanceKm < 10 ? ride.distanceKm.toFixed(1) : formatNumber(ride.distanceKm)
  return translate("statistics.kmValue", { count: distance })
}
