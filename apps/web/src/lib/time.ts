// Timetable times are naive Israel wall-clock values (no offset). We store them as `Date.UTC(...)` numbers and read
// them back with UTC accessors, so server (UTC) and browser (any timezone) always agree.
export type NaiveTime = number

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

export function parseNaive(value: string): NaiveTime {
  const [datePart, timePart = "00:00:00"] = value.split("T")
  const [y, m, d] = datePart.split("-").map(Number)
  const [h = 0, mi = 0, s = 0] = timePart.split(":").map(Number)
  return Date.UTC(y, m - 1, d, h, mi, s)
}

export function naiveFromParts(date: string, time: string): NaiveTime {
  return parseNaive(`${date}T${time}:00`)
}

/** The current wall-clock time in Israel, as a naive time. */
export function naiveNow(now: Date = new Date()): NaiveTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
}

/** `HH:mm` */
export function formatClock(naive: NaiveTime): string {
  return new Date(naive).toISOString().slice(11, 16)
}

/** `YYYY-MM-DD` */
export function dateKey(naive: NaiveTime): string {
  return new Date(naive).toISOString().slice(0, 10)
}

export function startOfDay(naive: NaiveTime): NaiveTime {
  return naive - (naive % DAY)
}

export function addDays(naive: NaiveTime, days: number): NaiveTime {
  return naive + days * DAY
}

export function addMinutes(naive: NaiveTime, minutes: number): NaiveTime {
  return naive + minutes * MINUTE
}

export function minutesBetween(from: NaiveTime, to: NaiveTime): number {
  return Math.round((to - from) / MINUTE)
}

export function isSameDay(a: NaiveTime, b: NaiveTime): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function hoursOf(naive: NaiveTime): number {
  return new Date(naive).getUTCHours()
}

/** Friday & Saturday — Israel Railways barely runs, so weekend results are rarely for the requested day. */
export function isWeekend(naive: NaiveTime): boolean {
  const day = new Date(naive).getUTCDay()
  return day === 5 || day === 6
}

export const isValidDateKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseNaive(value))
export const isValidClock = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** ISO-8601 string with Israel's UTC offset for the given naive time (for structured data / calendars). */
export function toIsoWithOffset(naive: NaiveTime): string {
  const guess = new Date(naive - 2 * 60 * 60 * 1000)
  const offsetPart = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jerusalem", timeZoneName: "longOffset" })
    .formatToParts(guess)
    .find((part) => part.type === "timeZoneName")?.value
  const offset = offsetPart && offsetPart !== "GMT" ? offsetPart.replace("GMT", "") : "+02:00"
  return `${new Date(naive).toISOString().slice(0, 19)}${offset}`
}
