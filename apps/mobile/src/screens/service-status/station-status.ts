/**
 * A station's status from the network's: which lines call there today, how each
 * is doing, the disruptions that name the station, and how its own next trains
 * are running. Pure, for the tests.
 */
import { type RailLine, RAIL_LINES } from "@/data/rail-lines"
import { type DayType, SERVICE_PATTERNS } from "@/data/rail-service-patterns"
import {
  type Disruption,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
  type StationDepartures,
  MINOR_DELAY_MINUTES,
  SEVERE_DELAY_MINUTES,
  compareServiceStatusLevels,
  isDisruptedLevel,
} from "@/services/api"

export type StationLineStatus = {
  line: RailLine
  /** What the server said about the line; missing when the snapshot has no entry for it. */
  status: LineStatus | undefined
  level: ServiceStatusLevel
}

export type StationStatus = {
  /** The station's headline level; undefined while it waits on the station's next trains to say. */
  level: ServiceStatusLevel | undefined
  /** The lines calling at the station on the day's timetable, in catalogue order. */
  lines: StationLineStatus[]
  /** The disruptions that name the station, worst first. */
  disruptions: Disruption[]
}

/** The lines that call at the station on the day's timetable (not the ones that only run through it). */
export const linesCallingAt = (stationId: string, dayType: DayType): RailLine[] => {
  const pattern = SERVICE_PATTERNS[dayType]
  const skipped = new Set(pattern.skipped.filter((s) => s.stationId === stationId).map((s) => s.lineId))
  return RAIL_LINES.filter(
    (line) => pattern.lines.includes(line.id) && line.stationIds.includes(stationId) && !skipped.has(line.id),
  )
}

const worst = (levels: ServiceStatusLevel[]): ServiceStatusLevel | undefined =>
  levels.length === 0 ? undefined : levels.reduce((a, b) => (compareServiceStatusLevels(b, a) > 0 ? b : a))

/** How far ahead the station's own trains count towards its headline. */
const NEXT_TRAINS_HORIZON_MS = 60 * 60_000
/** Late trains it takes, among those, before the station has delays; one train badly late is enough alone. */
const LATE_TRAINS_FOR_DELAYS = 2

/**
 * Whether a disruption is about single live trains rather than a stretch of the line: the delays, and a
 * lone cancellation. Those can be anywhere on the line, so a station only goes by its own next trains.
 */
const isAboutTrains = (disruption: Disruption): boolean => disruption.section === null && disruption.source !== "announcement"

/**
 * How the trains about to call at the station are running, the way the board on its card shows them:
 * a cancelled train, or one badly late, is severe; two or more cancelled leave the station part suspended;
 * a few late trains are delays. A single train a few minutes late is not the station's news.
 */
export const nextTrainsLevel = (departures: StationDepartures, now: Date): ServiceStatusLevel | undefined => {
  const horizon = now.getTime() + NEXT_TRAINS_HORIZON_MS
  const soon = departures.lines
    .flatMap((line) => line.directions.flatMap((direction) => direction.trains))
    .filter((train) => new Date(train.time).getTime() <= horizon)
  const cancelled = soon.filter((train) => train.cancelled)
  const late = soon.filter((train) => !train.cancelled && train.delayMinutes >= MINOR_DELAY_MINUTES)
  if (cancelled.length >= 2) return "partSuspended"
  if (cancelled.length === 1 || late.some((train) => train.delayMinutes >= SEVERE_DELAY_MINUTES)) return "severeDelays"
  if (late.length >= LATE_TRAINS_FOR_DELAYS) return "minorDelays"
  return undefined
}

/**
 * The station's headline: what names it, with how its own next trains run; else the worst of what its
 * lines have elsewhere; else how its lines are. Delays and single cancellations on a line count only
 * through the station's own trains; when those are not in yet it waits (undefined), and when they
 * cannot be had it falls back to the lines'.
 */
const headline = (
  lines: StationLineStatus[],
  disruptions: Disruption[],
  departures: StationDepartures | null | undefined,
  now: Date,
): ServiceStatusLevel | undefined => {
  const lineDisruptions = lines.flatMap((l) => l.status?.disruptions ?? [])
  const aboutTrains = lineDisruptions.filter((d) => isAboutTrains(d) && isDisruptedLevel(d.level))
  const trainsKnown = !!departures && departures.realtime.available

  const ownTrains = trainsKnown ? nextTrainsLevel(departures, now) : undefined
  const here = worst([...disruptions.map((d) => d.level), ...(ownTrains ? [ownTrains] : [])].filter(isDisruptedLevel))
  if (here) return here
  if (departures === undefined && aboutTrains.length > 0) return undefined

  const elsewhere = worst(
    (trainsKnown ? lineDisruptions.filter((d) => !isAboutTrains(d)).map((d) => d.level) : lines.map((l) => l.level)).filter(
      isDisruptedLevel,
    ),
  )
  if (elsewhere) return elsewhere
  if (lines.some((l) => l.level === "goodService" || (trainsKnown && isDisruptedLevel(l.level)))) return "goodService"
  if (lines.length > 0 && lines.every((l) => l.level === "noService")) return "noService"
  return "unknown"
}

/** The disruptions of every line in the snapshot that name the station, once each, worst first. */
export const stationDisruptions = (snapshot: ServiceStatusSnapshot | undefined, stationId: string): Disruption[] => {
  if (!snapshot) return []
  const seen = new Set<string>()
  const found: Disruption[] = []
  for (const line of snapshot.lines) {
    for (const disruption of line.disruptions) {
      if (!disruption.section?.stationIds.includes(stationId)) continue
      const key = `${disruption.id}:${disruption.section.fromStationId}-${disruption.section.toStationId}`
      if (seen.has(key)) continue
      seen.add(key)
      found.push(disruption)
    }
  }
  return found.sort((a, b) => compareServiceStatusLevels(b.level, a.level))
}

export const stationStatus = (
  snapshot: ServiceStatusSnapshot | undefined,
  stationId: string,
  dayType: DayType,
  /** The station's next trains: undefined while loading, null when they cannot be had. */
  departures: StationDepartures | null | undefined,
  /** Israel's wall clock, as the departures' naive times read. */
  now: Date,
): StationStatus => {
  const lines = linesCallingAt(stationId, dayType).map((line) => {
    const status = snapshot?.lines.find((l) => l.lineId === line.id)
    // A line the snapshot leaves out has no trains right now; with no snapshot at all, nothing is known.
    const level: ServiceStatusLevel = snapshot ? (status?.level ?? "noService") : "unknown"
    return { line, status, level }
  })
  const disruptions = stationDisruptions(snapshot, stationId)
  return { level: headline(lines, disruptions, departures, now), lines, disruptions }
}

/**
 * The station's headline the way the card colours it: green when all is well, orange for delays, red for
 * cancellations and suspended stretches, a colour of its own for works Israel Railways announced, and
 * grey when the station is closed, nothing runs, or nothing is known.
 */
export type StationStatusKind = "good" | "delays" | "cancellations" | "planned" | "noService" | "closed" | "unknown"

/** Undefined while the headline waits on the station's next trains. */
export const stationStatusKind = (status: StationStatus, stationClosed = false): StationStatusKind | undefined => {
  if (stationClosed) return "closed"
  if (status.level === undefined) return undefined
  // Works Israel Railways announced are planned, whatever their level, once they are the worst of what names the station.
  const worstNamed = status.disruptions.find((d) => isDisruptedLevel(d.level))
  if (worstNamed?.source === "announcement") return "planned"
  switch (status.level) {
    case "goodService":
      return "good"
    case "minorDelays":
    case "severeDelays":
      return "delays"
    case "partSuspended":
    case "suspended":
      return "cancellations"
    case "noService":
      return "noService"
    default:
      return "unknown"
  }
}
