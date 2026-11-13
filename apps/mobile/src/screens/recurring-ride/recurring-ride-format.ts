import { format } from "date-fns"
import { dateFnsLocalization, translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import type { RecurringRide } from "@/models/recurring-rides/recurring-rides"
import { formatClockTime } from "@/utils/helpers/date-helpers"

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]
export const WORKWEEK = [0, 1, 2, 3, 4]
// A Sunday, to name the weekdays in the app's language.
const A_SUNDAY = new Date(2026, 10, 15)

const weekdayDate = (day: number) => new Date(A_SUNDAY.getFullYear(), A_SUNDAY.getMonth(), A_SUNDAY.getDate() + day)

/** "Su", "א׳"… */
export const weekdayName = (day: number) => format(weekdayDate(day), "EEEEEE", { locale: dateFnsLocalization })

/** "Sunday", for screen readers */
export const weekdayFullName = (day: number) => format(weekdayDate(day), "EEEE", { locale: dateFnsLocalization })

/** "07:45 · Tel Aviv - Savidor → Haifa" */
export const describeRoute = (ride: Pick<RecurringRide, "originId" | "destinationId" | "departureTime">) =>
  translate("recurringRides.routeSummary", {
    // Stored as "HH:mm"; shown in the rider's 12- or 24-hour clock.
    time: formatClockTime(ride.departureTime),
    origin: getStationById(String(ride.originId))?.name ?? "",
    destination: getStationById(String(ride.destinationId))?.name ?? "",
  }) ?? ""

/** "15 min before", "1 hour before" */
export const leadTimeLabel = (minutes: number) =>
  (minutes === 60 ? translate("recurringRides.hourBefore") : translate("recurringRides.minutesBefore", { minutes })) ?? ""
