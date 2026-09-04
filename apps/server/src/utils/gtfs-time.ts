/**
 * gtfs-time.ts — Israel GTFS 28-hour ("extended") service-day time handling.
 *
 * Port of the israel-gtfs skill's scripts/gtfs_time.py. In this feed,
 * stop_times.arrival_time / departure_time are clock times measured from the
 * start of a *service day* and can exceed 24:00:00 (e.g. "25:30:00"). A naive
 * Date parse breaks on hours >= 24, so post-midnight trips silently fail.
 *
 * We care only about Israel Railways (route_type == 2), whose service day equals
 * the calendar day (00:00..24:00). Only trips that start before midnight and end
 * after it use extended (>24:00) times; a rail trip starting 00:00..04:00 belongs
 * to the day it starts on. (Non-rail uses a 04:00→03:59 day; we don't ingest it.)
 *
 * Anchoring strategy: schedule times are wall-clock (Asia/Jerusalem) and the
 * legacy Israel Railways API returned them as *naive* ISO strings ("2026-06-27T
 * 14:30:00") that clients parse with `new Date(...)`. To reproduce that exactly
 * we anchor each service date at **UTC midnight** and add the offset linearly,
 * then serialize with `toISOString().slice(0, 19)` — yielding the same naive
 * wall-clock string. Because every connection uses the same civil anchor,
 * ordering and gap math are consistent (DST never enters the picture).
 */

export const SECONDS_PER_DAY = 86_400

const pad = (n: number) => String(n).padStart(2, "0")

/** Parse an extended "H:MM:SS" / "HH:MM" string into seconds. Hours may be >= 24. */
export function parseOffsetSec(clock: string): number {
  const parts = clock.trim().split(":")
  let h: string
  let m: string
  let s: string
  if (parts.length === 2) {
    ;[h, m] = parts
    s = "0"
  } else if (parts.length === 3) {
    ;[h, m, s] = parts
  } else {
    throw new Error(`Not a GTFS time string: ${clock}`)
  }
  const hi = Number(h)
  const mi = Number(m)
  const si = Number(s)
  if (
    !Number.isInteger(hi) ||
    !Number.isInteger(mi) ||
    !Number.isInteger(si) ||
    hi < 0 ||
    mi < 0 ||
    mi >= 60 ||
    si < 0 ||
    si >= 60
  ) {
    throw new Error(`Out-of-range GTFS time: ${clock}`)
  }
  return hi * 3600 + mi * 60 + si
}

/** Format seconds back to extended "HH:MM:SS" (hours can exceed 23). */
export function formatOffset(sec: number): string {
  if (sec < 0) throw new Error("GTFS time offsets are non-negative")
  const total = Math.floor(sec)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** UTC-midnight anchor (ms) for a "YYYY-MM-DD" civil service date. */
export function serviceMidnightMs(serviceDate: string): number {
  const ms = Date.parse(`${serviceDate}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new Error(`Invalid service date: ${serviceDate}`)
  return ms
}

/** Convert a (service date, offset seconds) pair to a comparable epoch (ms). */
export function toEpochMs(serviceDate: string, offsetSec: number): number {
  return serviceMidnightMs(serviceDate) + offsetSec * 1000
}

/** Serialize an epoch (ms) to a naive wall-clock ISO string "YYYY-MM-DDTHH:MM:SS". */
export function toIsoString(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 19)
}

/** Convenience: (service date, offset seconds) -> naive ISO string. */
export function localIso(serviceDate: string, offsetSec: number): string {
  return toIsoString(toEpochMs(serviceDate, offsetSec))
}

/** Add `n` calendar days to a "YYYY-MM-DD" date, returning "YYYY-MM-DD". */
export function addDays(serviceDate: string, n: number): string {
  const ms = serviceMidnightMs(serviceDate) + n * SECONDS_PER_DAY * 1000
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Rail service dates to load for a query at (date, hour). Rail service day =
 * calendar day, so we load D and D+1 (a journey started late on D can continue,
 * and early-morning D+1 departures should show when the hour is late). When the
 * query hour is before 04:00 we also load D-1 to catch a train that departed
 * before midnight on D-1 with an extended (>24:00) time.
 */
export function railServiceDatesForQuery(date: string, hour: string): string[] {
  const dates = [date, addDays(date, 1)]
  const queryHour = Number(hour.split(":")[0])
  if (Number.isFinite(queryHour) && queryHour < 4) {
    dates.unshift(addDays(date, -1))
  }
  return dates
}
