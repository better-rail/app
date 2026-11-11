import { format } from "date-fns"
import { dateFnsLocalization, translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import type { RecurringRide } from "@/models/recurring-rides/recurring-rides"

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
export const WORKWEEK = [0, 1, 2, 3, 4]
// A Sunday, to name the weekdays in the app's language.
const A_SUNDAY = new Date(2026, 10, 15)

/** "Su", "א׳"… */
export const weekdayName = (day: number) =>
  format(new Date(A_SUNDAY.getFullYear(), A_SUNDAY.getMonth(), A_SUNDAY.getDate() + day), "EEEEEE", {
    locale: dateFnsLocalization,
  })

/** "07:45 · Tel Aviv - Savidor → Haifa" */
export const describeRoute = (ride: Pick<RecurringRide, "originId" | "destinationId" | "departureTime">) =>
  translate("recurringRides.routeSummary", {
    time: ride.departureTime,
    origin: getStationById(String(ride.originId))?.name ?? "",
    destination: getStationById(String(ride.destinationId))?.name ?? "",
  }) ?? ""

/** "Sun–Thu · 10 min before" */
export const describeSchedule = (ride: Pick<RecurringRide, "days" | "leadMinutes">) => {
  const days =
    ride.days.length === WORKWEEK.length && WORKWEEK.every((day) => ride.days.includes(day))
      ? translate("recurringRides.workweek")
      : ride.days.length === WEEKDAYS.length
        ? translate("recurringRides.everyDay")
        : [...ride.days].sort().map(weekdayName).join(", ")
  return `${days} · ${translate("recurringRides.minutesBefore", { minutes: ride.leadMinutes })}`
}
