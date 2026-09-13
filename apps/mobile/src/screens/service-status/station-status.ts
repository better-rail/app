/**
 * A station's status from the network's: which lines call there today, how each
 * is doing, and the disruptions that name the station. Pure, for the tests.
 */
import { type RailLine, RAIL_LINES } from "@/data/rail-lines"
import { type DayType, SERVICE_PATTERNS } from "@/data/rail-map-layout"
import {
  type Disruption,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
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
  /** The station's headline level. */
  level: ServiceStatusLevel
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

/** The station's headline: what names it, else the worst of its lines that is actually a disruption, else how its lines are. */
const headline = (lines: StationLineStatus[], disruptions: Disruption[]): ServiceStatusLevel => {
  const named = worst(disruptions.map((d) => d.level).filter(isDisruptedLevel))
  if (named) return named
  const disrupted = worst(lines.map((l) => l.level).filter(isDisruptedLevel))
  if (disrupted) return disrupted
  if (lines.some((l) => l.level === "goodService")) return "goodService"
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
): StationStatus => {
  const lines = linesCallingAt(stationId, dayType).map((line) => {
    const status = snapshot?.lines.find((l) => l.lineId === line.id)
    // A line the snapshot leaves out has no trains right now; with no snapshot at all, nothing is known.
    const level: ServiceStatusLevel = snapshot ? (status?.level ?? "noService") : "unknown"
    return { line, status, level }
  })
  const disruptions = stationDisruptions(snapshot, stationId)
  return { level: headline(lines, disruptions), lines, disruptions }
}

/**
 * The station's headline the way the card colours it: green when all is well, orange for delays, red for
 * cancellations and suspended stretches, a colour of its own for works Israel Railways announced, and
 * grey when the station is closed, nothing runs, or nothing is known.
 */
export type StationStatusKind = "good" | "delays" | "cancellations" | "planned" | "noService" | "closed" | "unknown"

export const stationStatusKind = (status: StationStatus, stationClosed = false): StationStatusKind => {
  if (stationClosed) return "closed"
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
