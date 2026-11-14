/**
 * schedule.ts — when a device's recurring rides are next due.
 *
 * A ride is due `leadMinutes` before its departure time on each of its weekdays, on Israel's clock, except the
 * dates the rider skipped. The device's object keeps one alarm for the earliest due ride and moves it after every
 * sync and every reminder.
 */
import type { RecurringRide } from "../types/device"
import { israelEpoch, israelWallClockMs } from "../utils/israel-time"

/** The next reminder: when it's due, and every ride due then. */
export type NextReminder = { at: number; rideIds: string[] }

// A ride on one weekday whose next 60 dates are all skipped is due 61 weeks out; nothing lies further.
const LOOKAHEAD_DAYS = 61 * 7 + 1

const pad = (n: number) => String(n).padStart(2, "0")

/** The next instant after `now` that `ride` is due, or undefined when it never is. */
export const nextDueAt = (ride: RecurringRide, now: number): number | undefined => {
  if (!ride.enabled) return undefined
  const today = new Date(israelWallClockMs(now))
  const skipped = new Set(ride.skipDates)

  // From yesterday: a ride just after midnight with a lead time is due the evening before.
  for (let offset = -1; offset <= LOOKAHEAD_DAYS; offset++) {
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + offset))
    if (!ride.days.includes(day.getUTCDay())) continue
    const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`
    if (skipped.has(date)) continue

    const dueAt = israelEpoch(`${date}T${ride.departureTime}:00`) - ride.leadMinutes * 60_000
    if (dueAt > now) return dueAt
  }
  return undefined
}

/** The earliest reminder after `now` across `rides`, or undefined when none is due again. */
export const nextReminder = (rides: RecurringRide[], now: number): NextReminder | undefined => {
  let next: NextReminder | undefined
  for (const ride of rides) {
    const at = nextDueAt(ride, now)
    if (at === undefined) continue
    if (!next || at < next.at) next = { at, rideIds: [ride.id] }
    else if (at === next.at) next.rideIds.push(ride.id)
  }
  return next
}
