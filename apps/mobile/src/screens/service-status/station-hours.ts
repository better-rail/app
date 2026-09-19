/**
 * Whether a station is open right now, from the opening hours of its entrances
 * (services/api/station-info.types.ts), and the labels for those hours.
 *
 * Pure: the clock comes in as Israel's wall-clock day and minute, so the same
 * answer comes out wherever the phone is, and the tests can set the time.
 */
import type { StationEntrance, StationHours } from "@/services/api"

/** Israel's wall clock: the day of the week (1 = Sunday … 7 = Saturday) and minutes past midnight. */
export type WallClock = { day: number; minutes: number }

export type OpenState =
  /** Open now; `until` is "HH:mm", or null when open around the clock. */
  | { state: "open"; until: string | null }
  /** Closed now; `opensAt` is the next opening, with its day when not today; null when no opening is listed. */
  | { state: "closed"; opensAt: { day: number; time: string } | null }
  /** No entrance hours to go by. */
  | { state: "unknown" }

/** Parts of a Date, in the zone the Date's local fields are in, as a wall clock. */
export const wallClockOf = (date: Date): WallClock => ({
  day: date.getDay() + 1,
  minutes: date.getHours() * 60 + date.getMinutes(),
})

const minutesOf = (clock: string): number => {
  const [h, m] = clock.split(":").map(Number)
  return h * 60 + m
}

/** The day `ahead` days after `day` (1 = Sunday … 7 = Saturday), `ahead` may be negative. */
const dayAfter = (day: number, ahead: number): number => ((day - 1 + ahead + 7 * 7) % 7) + 1

/** Whether `hours` (a row of the table) has the entrance open at `clock`, and until when. */
const openUnder = (hours: StationHours, clock: WallClock): { until: string | null } | undefined => {
  if (hours.closed) return undefined
  if (hours.allDay) return hours.days.includes(clock.day) ? { until: null } : undefined
  if (!hours.opens || !hours.closes) return undefined
  const opens = minutesOf(hours.opens)
  const closes = minutesOf(hours.closes)
  const spansMidnight = closes <= opens
  if (hours.days.includes(clock.day)) {
    if (spansMidnight ? clock.minutes >= opens : clock.minutes >= opens && clock.minutes < closes) return { until: hours.closes }
  }
  // The small hours of a span that started the day before.
  if (spansMidnight && hours.days.includes(dayAfter(clock.day, -1)) && clock.minutes < closes) return { until: hours.closes }
  return undefined
}

/** The next time any of `rows` opens at or after `clock`, looking a week ahead. */
const nextOpening = (rows: StationHours[], clock: WallClock): { day: number; time: string } | null => {
  for (let ahead = 0; ahead < 7; ahead++) {
    const day = dayAfter(clock.day, ahead)
    const candidates = rows
      .filter((h) => !h.closed && h.days.includes(day))
      .map((h) => (h.allDay ? "00:00" : h.opens))
      .filter((time): time is string => time !== null)
      .filter((time) => ahead > 0 || minutesOf(time) > clock.minutes)
      .sort((a, b) => minutesOf(a) - minutesOf(b))
    if (candidates.length > 0) return { day, time: candidates[0] }
  }
  return null
}

/** The rows of the table that are the entrances' own hours. */
const entranceHours = (entrances: StationEntrance[]): StationHours[] =>
  entrances.flatMap((e) => e.hours.filter((h) => h.kind === "entrance"))

/** Whether the station is open at `clock`: it is while any entrance is. */
export const stationOpenState = (entrances: StationEntrance[], clock: WallClock): OpenState => {
  const rows = entranceHours(entrances)
  if (rows.length === 0) return { state: "unknown" }
  const open = rows.map((h) => openUnder(h, clock)).filter((o): o is { until: string | null } => o !== undefined)
  if (open.length > 0) {
    // The latest closing wins; around the clock beats them all.
    if (open.some((o) => o.until === null)) return { state: "open", until: null }
    const closings = open.map((o) => o.until as string)
    const latest = closings.reduce((a, b) => (lateness(b, clock) > lateness(a, clock) ? b : a))
    return { state: "open", until: latest }
  }
  return { state: "closed", opensAt: nextOpening(rows, clock) }
}

/** An entrance closing within this many minutes is "closing soon". */
export const CLOSING_SOON_MINUTES = 30

export type OpenBadge = "open" | "closingSoon" | "closed"

/** How an entrance's badge reads for its open state at `clock`; undefined when it lists no hours. */
export const openBadgeOf = (state: OpenState, clock: WallClock): OpenBadge | undefined => {
  if (state.state === "unknown") return undefined
  if (state.state === "closed") return "closed"
  if (state.until !== null && lateness(state.until, clock) <= CLOSING_SOON_MINUTES) return "closingSoon"
  return "open"
}

/** Minutes from `clock` to a closing time, counting one past midnight as tomorrow's. */
const lateness = (closes: string, clock: WallClock): number => {
  const minutes = minutesOf(closes)
  return minutes <= clock.minutes ? minutes + 24 * 60 - clock.minutes : minutes - clock.minutes
}

/**
 * The days a row applies to as ranges: [1,2,3,4,5] → "Sun–Thu", [6] → "Fri", [1,3] → "Sun, Tue".
 * `dayName` names a day (1 = Sunday) in the user's language.
 */
export const dayRangeLabel = (days: number[], dayName: (day: number) => string): string => {
  const sorted = [...new Set(days)].sort((a, b) => a - b)
  if (sorted.length === 0) return ""
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  const flush = () => ranges.push(start === end ? dayName(start) : `${dayName(start)}–${dayName(end)}`)
  for (const day of sorted.slice(1)) {
    if (day === end + 1) end = day
    else {
      flush()
      start = day
      end = day
    }
  }
  flush()
  return ranges.join(", ")
}

/** The rows of one kind, in the order of their first day, for a table. */
export const hoursOfKind = (entrance: StationEntrance, kind: StationHours["kind"]): StationHours[] =>
  entrance.hours.filter((h) => h.kind === kind).sort((a, b) => Math.min(...a.days) - Math.min(...b.days))
