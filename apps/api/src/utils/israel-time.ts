/**
 * israel-time.ts — the one place the Worker's clock meets Israel's.
 *
 * The Bun server ran with TZ=Asia/Jerusalem, so a naive timetable string such
 * as "2026-10-22T14:30:00" parsed with `new Date()` landed on the real instant
 * of that wall-clock time in Israel, and the ride tracker compared it against
 * `Date.now()`. Workers run in UTC with no TZ setting, so the same parse would
 * be two or three hours off: notification times, the alarm fire dates handed
 * to the devices and the Live Activity dismissal date would all shift. These
 * helpers do that conversion explicitly (DST included, via Intl).
 */

const ISRAEL = "Asia/Jerusalem"

const parts = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISRAEL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

/** The Israel wall clock at a real instant, as the naive epoch gtfs-time uses (the clock reading anchored at UTC). */
export const israelWallClockMs = (realMs: number): number => {
  const p: Record<string, string> = {}
  for (const part of parts.formatToParts(realMs)) p[part.type] = part.value
  return Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`)
}

/** Israel's UTC offset (ms) at a real instant. */
const offsetAt = (realMs: number): number => israelWallClockMs(realMs) - realMs

const NAIVE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/

/**
 * Parse a timetable string into a real epoch (ms): a naive "YYYY-MM-DDTHH:mm:ss"
 * is read as Israel wall-clock time; a string with a zone (Z or an offset) is
 * taken as the instant it names. NaN when unparsable, like `Date.parse`.
 */
export const israelEpoch = (value: string): number => {
  const m = NAIVE.exec(value.trim())
  if (!m) return Date.parse(value)
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0))
  // The offset in force at that wall-clock time: guess with the offset at the naive
  // instant, then re-read it at the guessed instant (settles a DST transition).
  let real = naive - offsetAt(naive)
  real = naive - offsetAt(real)
  return real
}

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * The "YYYY-MM-DD" and "HH:mm" a departure date names on Israel's clock: a naive
 * string as written, a zoned one converted (the way `dayjs(value).format()` did
 * under TZ=Asia/Jerusalem).
 */
export const israelDateAndHour = (value: string): { date: string; hour: string } => {
  const wall = NAIVE.test(value.trim())
    ? Date.parse(`${value.trim().slice(0, 19).padEnd(19, "0")}Z`)
    : israelWallClockMs(Date.parse(value))
  const d = new Date(wall)
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    hour: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  }
}
