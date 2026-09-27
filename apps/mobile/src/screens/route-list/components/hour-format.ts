import { use12HourClock } from "@/i18n"
import { formatTime } from "@/utils/helpers/date-helpers"

/** Compact label for the hour index: "13" on a 24-hour clock, "1p" on a 12-hour one */
export function formatHourLabel(hour: number) {
  if (!use12HourClock) return hour.toString().padStart(2, "0")
  return `${hour % 12 || 12}${hour < 12 ? "a" : "p"}`
}

/** The full hour as route cards show it: "13:00" or "1:00 PM" */
export const formatHourTime = (hour: number) => formatTime(new Date(2000, 0, 1, hour))
