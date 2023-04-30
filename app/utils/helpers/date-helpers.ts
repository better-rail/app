import { differenceInMilliseconds, formatDuration, intervalToDuration, isWithinInterval, parse } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { dateDelimiter, dateFnsLocalization } from "../../i18n"

/**
 * Parses a string date as formatted in the Israel Rail API.
 * We need this function since the date comes formatted as 'dd/MM/YYYY', while JavaScript parses dates using the 'MM/dd/YYYY' format.
 *
 * @param {string} dateString - A date formatted string
 * @returns {number} The parsed date in milliseconds
 */
export function parseApiDate(dateString: string) {
  const date = dateString.substring(0, 10)
  const time = dateString.substring(11)
  const [day, month, year] = date.split("/")

  if (parseInt(month) > 12) {
    throw new Error("The provided date is formatted incorrectly.\nEnsure the date uses the `dd/MM/YYYY` format.")
  }
  const formattedDate = `${day}/${month}/${year} ${time}`
  const parsedDate = parse(formattedDate, "dd/MM/yyyy HH:mm:ss", new Date())
  return parsedDate.getTime()
}

export function isWeekend(date: Date) {
  const dayOfWeek = date.getDay()
  return dayOfWeek === 5 || dayOfWeek === 6 // 5 = Friday, 6 = Saturday
}

export function isOneHourDifference(date1: number, date2: number) {
  const withinRange = isWithinInterval(date2, {
    start: date1 - 59 * 60 * 1000,
    end: date1 + 59 * 60 * 1000,
  })

  return withinRange
}

export function routeDurationInMs(departureTime: number, arrivalTime: number) {
  return differenceInMilliseconds(arrivalTime, departureTime)
}

export function formatRouteDuration(durationInMilliseconds: number) {
  const durationObject = intervalToDuration({ start: 0, end: durationInMilliseconds }) // Create a date-fns duration object
  return formatDuration(durationObject, { delimiter: dateDelimiter, locale: dateFnsLocalization }) // Format the duration
}

// Sometimes we need to ensure that the date is in the correct timezone.
// This function will convert the date to the time in Asia/Jersualem.
export function timezoneCorrection(date: Date) {
  const tzString = formatInTimeZone(date, "Asia/Jerusalem", "yyyy-MM-dd HH:mm:ss")
  return new Date(tzString)
}
