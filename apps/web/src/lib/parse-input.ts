import { addDays, dateKey, parseNaive } from "./time"

const pad = (value: number) => String(value).padStart(2, "0")

/**
 * A time of day as people type it: "9" → 09:00, "930" → 09:30, "16:17" / "16.17" / "1617" → 16:17.
 * Null when it isn't one.
 */
export function parseTimeInput(text: string): string | null {
  const trimmed = text.trim()
  let hours: number
  let minutes: number
  const separated = trimmed.match(/^(\d{1,2})[:.\s](\d{1,2})$/)
  if (separated) {
    hours = Number(separated[1])
    minutes = Number(separated[2])
  } else if (/^\d{1,4}$/.test(trimmed)) {
    hours = Number(trimmed.length <= 2 ? trimmed : trimmed.slice(0, -2))
    minutes = trimmed.length <= 2 ? 0 : Number(trimmed.slice(-2))
  } else {
    return null
  }
  if (hours > 23 || minutes > 59) return null
  return `${pad(hours)}:${pad(minutes)}`
}

/**
 * A day as people type it, day first like the field shows it: "7/9", "07.09.2026", "7-9-26", "2026-09-07", or the
 * field's own "Today" / "Tomorrow" labels in either language. Without a year it's the next such day on or after
 * `today`. Null when unparseable, impossible (31/02), or in the past.
 */
export function parseDateInput(text: string, today: string): string | null {
  const trimmed = text.trim().toLowerCase()
  if (trimmed === "today" || trimmed === "היום") return today
  if (trimmed === "tomorrow" || trimmed === "מחר") return dateKey(addDays(parseNaive(today), 1))

  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const dayFirst = trimmed.match(/^(\d{1,2})[./\-\s](\d{1,2})(?:[./\-\s](\d{2}|\d{4}))?$/)
  let key: string | null
  if (iso) {
    key = buildKey(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  } else if (dayFirst) {
    const day = Number(dayFirst[1])
    const month = Number(dayFirst[2])
    if (dayFirst[3] === undefined) {
      const thisYear = Number(today.slice(0, 4))
      const candidate = buildKey(thisYear, month, day)
      key = candidate && candidate >= today ? candidate : buildKey(thisYear + 1, month, day)
    } else {
      const year = Number(dayFirst[3])
      key = buildKey(year < 100 ? 2000 + year : year, month, day)
    }
  } else {
    return null
  }
  return key && key >= today ? key : null
}

/** `YYYY-MM-DD` for a real calendar day, else null. */
function buildKey(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return dateKey(date.getTime())
}
