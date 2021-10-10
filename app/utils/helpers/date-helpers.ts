import { parse } from "date-fns"

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
