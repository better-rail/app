/**
 * The service patterns for the Service Status map, from the GTFS feed the
 * server holds: which lines run, where their trains end short of the line's
 * ends, and which stations some or all of them run through — per day type.
 * Writes station-patterns.json and the SERVICE_PATTERNS
 * block of src/data/rail-service-patterns.ts.
 *
 *     cd apps/server && bun run ../mobile/scripts/rail-service-patterns/service-patterns.ts
 *
 * The trains of the next two weeks are sorted into the day types: `night` is
 * the trains leaving between 00:15 and 04:30 after a Sunday–Thursday, `weekend`
 * the rest of Friday's and Saturday's, `weekday` the rest of Sunday's to
 * Thursday's. So the night trains, which run through most stations, do not
 * make those stations look irregular by day.
 *
 * The 8xxx trains are additions pinned to a date (a holiday eve's timetable,
 * a Wednesday extra) and would make a whole day type look like that one day,
 * so they are left out — unless one runs on every date of its day type in the
 * window, which makes it a standing extra (8718, a daily peak train).
 *
 * By day, only the trains leaving between 05:00 and 23:45 shape the map: the
 * first and last trains of a day keep the night pattern, calling at stations
 * the hourly service runs through, and would put a dot there.
 *
 * A line runs on a day type with three or more trains in it (three or more a
 * night, at night, so a stray last train does not count). Of the stations
 * between a train's ends, those nine in ten trains run through are `skipped`
 * (no dot on the map), those a fifth or more run through are `irregular`, and
 * stations short of the line's ends where a tenth or more of its trains end
 * are `terminals`.
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { getPool } from "../../../server/src/db"
import { RAIL_LINES } from "../../../server/src/status/lines"
import { assignLine } from "../../../server/src/status/service-status"

const HERE = dirname(fileURLToPath(import.meta.url))
const PATTERNS = join(HERE, "station-patterns.json")
const LAYOUT = join(HERE, "../../src/data/rail-service-patterns.ts")
const NIGHT_FROM_SEC = (24 * 60 + 15) * 60
const NIGHT_UNTIL_SEC = (4 * 60 + 30) * 60
const DAY_FROM_SEC = 5 * 60 * 60
const DAY_UNTIL_SEC = (23 * 60 + 45) * 60
const DAYS_AHEAD = 14
const MIN_TRIPS_PER_NIGHT = 3
const MIN_TRAINS = 3
const SKIPPED_SHARE = 0.9
const IRREGULAR_SHARE = 0.2
const TERMINAL_SHARE = 0.1

type DayType = "weekday" | "weekend" | "night"
type Trip = { date: string; weekday: number; trainNumber: number; stops: number[]; firstDep: number }
type Pattern = { irregular: Record<string, number>; skipped: Record<string, number>; terminals: Record<string, number> }
type Variant = { lines: string[]; patterns: Record<string, Pattern> }

const pool = getPool()
const feed = (await pool.query(`SELECT feed_id FROM feeds WHERE is_active LIMIT 1`)).rows[0]
if (!feed) throw new Error("no active GTFS feed")
const dates: string[] = []
for (let i = 1; i <= DAYS_AHEAD; i++) dates.push(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10))
const { rows } = await pool.query<{
  service_date: string
  trip_id: string
  train_number: number
  rail_id: number
  dep_offset_sec: number
}>(
  `SELECT cd.service_date::text AS service_date, st.trip_id, t.train_number, st.rail_id, st.dep_offset_sec
     FROM calendar_dates cd
     JOIN trips t ON t.feed_id = cd.feed_id AND t.service_id = cd.service_id
     JOIN stop_times st ON st.feed_id = t.feed_id AND st.trip_id = t.trip_id
    WHERE cd.feed_id = $1 AND cd.service_date = ANY($2::date[]) AND st.rail_id IS NOT NULL
    ORDER BY cd.service_date, st.trip_id, st.stop_sequence`,
  [feed.feed_id, dates],
)
await pool.end()

const trips = new Map<string, Trip>()
for (const row of rows) {
  const key = `${row.service_date}#${row.trip_id}`
  let trip = trips.get(key)
  if (!trip) {
    trip = {
      date: row.service_date,
      weekday: new Date(`${row.service_date}T12:00:00`).getDay(),
      trainNumber: row.train_number,
      stops: [],
      firstDep: row.dep_offset_sec,
    }
    trips.set(key, trip)
  }
  trip.stops.push(row.rail_id)
}

// The night after a service day runs past 24:00 in its own times; the small hours before the next day's first trains are that day's.
const isNight = (t: Trip) =>
  (t.weekday <= 4 && t.firstDep >= NIGHT_FROM_SEC) || (t.weekday >= 1 && t.weekday <= 5 && t.firstDep < NIGHT_UNTIL_SEC)
const dayTypeOf = (t: Trip): DayType => (isNight(t) ? "night" : t.weekday === 5 || t.weekday === 6 ? "weekend" : "weekday")
/** The service day a trip counts towards: a night belongs to the evening it follows. */
const dayOf = (t: Trip): string =>
  isNight(t) && t.firstDep < NIGHT_UNTIL_SEC
    ? new Date(new Date(`${t.date}T12:00:00`).getTime() - 86_400_000).toISOString().slice(0, 10)
    : t.date

const byDayType: Record<DayType, Map<string, Trip[]>> = { weekday: new Map(), weekend: new Map(), night: new Map() }
const days: Record<DayType, Set<string>> = { weekday: new Set(), weekend: new Set(), night: new Set() }
for (const trip of trips.values()) days[dayTypeOf(trip)].add(dayOf(trip))

// An 8xxx train is an addition pinned to a date, unless it runs on every date of its day type.
const isAddition = (n: number) => n >= 8000 && n < 9000
const additionDates = new Map<string, Set<string>>()
for (const trip of trips.values()) {
  if (!isAddition(trip.trainNumber)) continue
  const key = `${trip.trainNumber}|${trip.stops.join(",")}`
  additionDates.set(key, (additionDates.get(key) ?? new Set()).add(dayOf(trip)))
}
const isOneOff = (trip: Trip) =>
  isAddition(trip.trainNumber) &&
  (additionDates.get(`${trip.trainNumber}|${trip.stops.join(",")}`)?.size ?? 0) < days[dayTypeOf(trip)].size

const isDaytime = (t: Trip) => t.firstDep >= DAY_FROM_SEC && t.firstDep < DAY_UNTIL_SEC

for (const trip of trips.values()) {
  if (isOneOff(trip)) continue
  const dayType = dayTypeOf(trip)
  if (dayType !== "night" && !isDaytime(trip)) continue
  const lineId = assignLine({
    tripKey: trip.date,
    trainNumber: trip.trainNumber,
    stops: trip.stops.map((railId) => ({ railId, platform: 0, arrTs: 0, depTs: 0 })),
  })
  if (lineId) byDayType[dayType].set(lineId, [...(byDayType[dayType].get(lineId) ?? []), trip])
}

const share = (n: number, of: number) => Math.round((n / of) * 100) / 100

const variantFor = (dayType: DayType): Variant => {
  const variant: Variant = { lines: [], patterns: {} }
  for (const line of RAIL_LINES) {
    const lineTrips = byDayType[dayType].get(line.id) ?? []
    const enough =
      dayType === "night"
        ? lineTrips.length / Math.max(days.night.size, 1) >= MIN_TRIPS_PER_NIGHT
        : lineTrips.length >= MIN_TRAINS
    if (!enough) continue
    variant.lines.push(line.id)
    const corridor = line.stationIds.map(Number)
    const position = new Map(corridor.map((id, i) => [id, i]))
    const ends = new Map<number, number>()
    const passing = new Map<number, number>()
    const skipped = new Map<number, number>()
    for (const trip of lineTrips) {
      const first = trip.stops[0]
      const last = trip.stops[trip.stops.length - 1]
      ends.set(first, (ends.get(first) ?? 0) + 1)
      ends.set(last, (ends.get(last) ?? 0) + 1)
      const [lo, hi] = [position.get(first) ?? 0, position.get(last) ?? 0].sort((a, b) => a - b)
      const calls = new Set(trip.stops)
      for (const station of corridor.slice(lo, hi + 1)) {
        passing.set(station, (passing.get(station) ?? 0) + 1)
        if (!calls.has(station)) skipped.set(station, (skipped.get(station) ?? 0) + 1)
      }
    }
    const pattern: Pattern = { irregular: {}, skipped: {}, terminals: {} }
    for (const [station, count] of skipped) {
      const of = passing.get(station) ?? 1
      if (count < MIN_TRAINS || count / of < IRREGULAR_SHARE) continue
      pattern[count / of >= SKIPPED_SHARE ? "skipped" : "irregular"][String(station)] = share(count, of)
    }
    const lineEnds = new Set([corridor[0], corridor[corridor.length - 1]])
    for (const [station, count] of ends) {
      if (count >= MIN_TRAINS && count / lineTrips.length >= TERMINAL_SHARE && !lineEnds.has(station)) {
        pattern.terminals[String(station)] = share(count, lineTrips.length)
      }
    }
    variant.patterns[line.id] = pattern
  }
  variant.lines.sort()
  return variant
}

const patterns: Record<DayType, Variant> = {
  weekday: variantFor("weekday"),
  weekend: variantFor("weekend"),
  night: variantFor("night"),
}

// Keys in plain string order (JSON.stringify would put "10" before "2"), one item a line, as the file has always been.
const toJson = (value: unknown, depth = 0): string => {
  const pad = "  ".repeat(depth + 1)
  const close = "  ".repeat(depth)
  if (Array.isArray(value)) {
    return value.length ? `[\n${value.map((v) => pad + toJson(v, depth + 1)).join(",\n")}\n${close}]` : "[]"
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return entries.length
      ? `{\n${entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${toJson(v, depth + 1)}`).join(",\n")}\n${close}}`
      : "{}"
  }
  return JSON.stringify(value)
}
writeFileSync(PATTERNS, `${toJson(patterns)}\n`)

// The same, as the SERVICE_PATTERNS block of rail-service-patterns.ts.
const lineStation = (lineId: string, stationId: string) => `      { lineId: "${lineId}", stationId: "${stationId}" },\n`
const block = (["weekday", "weekend", "night"] as const)
  .map((dayType) => {
    const variant = patterns[dayType]
    const entries = Object.entries(variant.patterns).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    const field = (name: keyof Pattern) =>
      `    ${name}: [\n${entries
        .flatMap(([lineId, p]) =>
          Object.keys(p[name])
            .sort()
            .map((stationId) => lineStation(lineId, stationId)),
        )
        .join("")}    ],\n`
    return `  ${dayType}: {\n    lines: [${variant.lines.map((id) => `"${id}"`).join(", ")}],\n${field("irregular")}${field("terminals")}${field("skipped")}  },\n`
  })
  .join("")
const layout = readFileSync(LAYOUT, "utf8")
const start = layout.indexOf("export const SERVICE_PATTERNS")
const end = layout.indexOf("\n}\n", start)
if (start < 0 || end < 0) throw new Error("SERVICE_PATTERNS block not found in rail-service-patterns.ts")
const open = layout.indexOf("{\n", start) + 2
writeFileSync(LAYOUT, layout.slice(0, open) + block + layout.slice(end + 1))

const list = (record: Record<string, number>) => Object.keys(record).join(" ") || "-"
for (const [dayType, variant] of Object.entries(patterns)) {
  console.log(`== ${dayType} (${days[dayType as DayType].size} days): lines ${variant.lines.join(", ")}`)
  for (const [lineId, pattern] of Object.entries(variant.patterns)) {
    if (Object.keys(pattern.skipped).length || Object.keys(pattern.irregular).length || Object.keys(pattern.terminals).length) {
      console.log(
        `  ${lineId}: skipped ${list(pattern.skipped)}; irregular ${list(pattern.irregular)}; terminals ${list(pattern.terminals)}`,
      )
    }
  }
}
