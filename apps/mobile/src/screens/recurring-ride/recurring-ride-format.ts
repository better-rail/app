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

/** A "YYYY-MM-DD" date at midnight, on the device's clock */
export const calendarDate = (date: string) => {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day)
}

/** The "YYYY-MM-DD" a one-time ride keeps */
export const dateKey = (date: Date | number) => format(date, "yyyy-MM-dd")

/** A one-time ride's date: "Tuesday, 17 November" */
export const rideDateLabel = (date: string) => format(calendarDate(date), "EEEE, d MMMM", { locale: dateFnsLocalization })

/** A one-time ride's date, short: "Tu, 17 Nov" */
export const rideDateShort = (date: string) => format(calendarDate(date), "EEEEEE, d MMM", { locale: dateFnsLocalization })

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
