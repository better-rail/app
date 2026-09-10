/**
 * Mirror of the server's service-status contract
 * (apps/server/src/types/service-status.ts) — keep the two in sync.
 *
 * This is the data both the Service Status list, the network map and the
 * per-line details sheet consume. Station ids are the app's "3700"-style ids.
 */

/** Ordered from healthiest to most disrupted; `unknown` sorts last. */
export const SERVICE_STATUS_LEVELS = [
  "goodService",
  "minorDelays",
  "severeDelays",
  "partSuspended",
  "suspended",
  "noService",
  "unknown",
] as const

export type ServiceStatusLevel = (typeof SERVICE_STATUS_LEVELS)[number]

export type DisruptionKind = "delays" | "cancellations" | "skippedStops" | "curtailment" | "suspension"

export type AffectedTrainStatus = "delayed" | "cancelled" | "curtailed" | "skippingStops"

/** Delay thresholds (minutes) the server applies; shown in the legend. */
export const MINOR_DELAY_MINUTES = 5
export const SEVERE_DELAY_MINUTES = 15

export type AffectedTrain = {
  trainNumber: number
  status: AffectedTrainStatus
  originStationId: string
  destinationStationId: string
  /** Naive wall-clock ISO strings ("YYYY-MM-DDTHH:MM:SS"), like the timetable API. */
  departureTime: string
  arrivalTime: string
  delayMinutes: number
  nextStationId?: string
  actualDestinationStationId?: string
  skippedStationIds?: string[]
}

export type DisruptionSection = {
  fromStationId: string
  toStationId: string
  /** Every station of the stretch, inclusive, in the line's station order. */
  stationIds: string[]
}

export type Disruption = {
  id: string
  kind: DisruptionKind
  level: ServiceStatusLevel
  /** The stretch of the line the map flags; null when it concerns the whole line or single trains. */
  section: DisruptionSection | null
  trains: AffectedTrain[]
}

export type LineStatus = {
  lineId: string
  level: ServiceStatusLevel
  /** Worst first. */
  disruptions: Disruption[]
  trains: { active: number; delayed: number; cancelled: number; maxDelayMinutes: number }
  /** Catalogue echo, used when the app's own catalogue does not know the line. */
  line: { badge: string; color: string; name: { he: string; en: string }; stationIds: string[] }
}

export type ServiceStatusSnapshot = {
  schemaVersion: 1
  generatedAt: string
  serviceDate: string
  realtime: { available: boolean; updatedAt: string | null }
  network: { level: ServiceStatusLevel; counts: Partial<Record<ServiceStatusLevel, number>> }
  lines: LineStatus[]
}

/** Positive when `a` is worse than `b`. */
export const compareServiceStatusLevels = (a: ServiceStatusLevel, b: ServiceStatusLevel): number =>
  SERVICE_STATUS_LEVELS.indexOf(a) - SERVICE_STATUS_LEVELS.indexOf(b)

/** Levels that mean the line is running but not as scheduled. */
export const isDisruptedLevel = (level: ServiceStatusLevel): boolean =>
  level === "minorDelays" || level === "severeDelays" || level === "partSuspended" || level === "suspended"
