import { isWithinInterval, parse } from "date-fns"

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

/**
 * Parses a route duration string formatted like '00:42:00' to milliseconds
 * @param duration A string formatted like '00:42:00'
 * @returns The duration in milliseconds
 */
export function parseRouteDuration(estTime: string) {
  const estTimeParts = estTime.split(":") // The estTime value is formatted like '00:42:00'
  const [hours, minutes] = estTimeParts.map((value) => parseInt(value)) // Grab the hour & minutes values
  const durationInMilliseconds = (hours * 60 * 60 + minutes * 60) * 1000 //  Convert to milliseconds
  return durationInMilliseconds
}
