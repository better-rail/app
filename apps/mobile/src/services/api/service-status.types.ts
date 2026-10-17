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

export type DisruptionKind = "delays" | "cancellations" | "skippedStops" | "curtailment" | "suspension" | "extraTrains"

export type AffectedTrainStatus = "delayed" | "cancelled" | "curtailed" | "skippingStops" | "added"

/** Where a disruption was seen: the live feed, an Israel Railways announcement, or their timetable vs the schedule. */
export type DisruptionSource = "realtime" | "announcement" | "timetable"

/** The ways Israel Railways offers around a disruption. */
export type TransportMode = "shuttle" | "bus" | "train" | "lightRail" | "other"

/** A sentence in every language the app speaks. */
export type LocalizedText = { he: string; en: string; ru: string; ar: string }

/** One way around a disruption that Israel Railways offers. */
export type TravelAlternative = {
  mode: TransportMode
  /** Whether Israel Railways says it costs nothing (shuttle buses usually do). */
  free: boolean
  description: LocalizedText
}

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
  /**
   * The stations concerned, in the line's station order: every station of the stretch for a stretch
   * with no service, only the skipped ones (not necessarily adjacent) for `skippedStops`.
   */
  stationIds: string[]
}

export type Disruption = {
  id: string
  kind: DisruptionKind
  level: ServiceStatusLevel
  /** The stretch of the line the map flags; null when it concerns the whole line or single trains. */
  section: DisruptionSection | null
  /** Live trains it concerns; empty for an announcement no live train has confirmed yet. */
  trains: AffectedTrain[]
  /** Missing from older servers, which only had the live feed. */
  source?: DisruptionSource
  /** Why, as Israel Railways put it. Announcements only. */
  reason?: LocalizedText
  /** Ways around it Israel Railways offers. Announcements only. */
  alternatives?: TravelAlternative[]
  /** Israel Railways' page about it. */
  link?: string
  /** When the announced disruption is in force (naive wall-clock); `to` is null when open-ended. */
  validity?: { from: string; to: string | null }
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
  /** When Israel Railways' announcements were last read in; missing from older servers. */
  announcements?: { updatedAt: string | null }
  /** When Israel Railways' timetable was last compared with the schedule; missing from older servers. */
  timetable?: { checkedAt: string | null; available: boolean }
  network: { level: ServiceStatusLevel; counts: Partial<Record<ServiceStatusLevel, number>> }
  lines: LineStatus[]
}

/** Positive when `a` is worse than `b`. */
export const compareServiceStatusLevels = (a: ServiceStatusLevel, b: ServiceStatusLevel): number =>
  SERVICE_STATUS_LEVELS.indexOf(a) - SERVICE_STATUS_LEVELS.indexOf(b)

/** Levels that mean the line is running but not as scheduled. */
export const isDisruptedLevel = (level: ServiceStatusLevel): boolean =>
  level === "minorDelays" || level === "severeDelays" || level === "partSuspended" || level === "suspended"
