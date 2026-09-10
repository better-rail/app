/**
 * service-status.ts — the contract between the server and the app's Service
 * Status screen (line list, network map and the per-line details sheet).
 *
 * Everything here is derived, read-only data: the GTFS timetable in Postgres
 * laid over with the SIRI snapshot the poller keeps in redis. Nothing is
 * persisted — the response is recomputed (and briefly cached) on demand.
 *
 * Station ids are the app's canonical Israel-Railways "3700"-style ids, as
 * strings, so the client can label them with `stations.ts` in any language.
 * Times are the planner's naive wall-clock ISO strings ("YYYY-MM-DDTHH:MM:SS"),
 * the same convention the timetable search uses.
 *
 * The app keeps a mirror of these types in
 * apps/mobile/src/services/api/service-status.types.ts — keep them in sync.
 */
import { z } from "zod"

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

export const DISRUPTION_KINDS = ["delays", "cancellations", "skippedStops", "curtailment", "suspension"] as const

export type DisruptionKind = (typeof DISRUPTION_KINDS)[number]

export const AFFECTED_TRAIN_STATUSES = ["delayed", "cancelled", "curtailed", "skippingStops"] as const

export type AffectedTrainStatus = (typeof AFFECTED_TRAIN_STATUSES)[number]

/** Delay thresholds (minutes), shared with the tests and mirrored in the app's copy. */
export const MINOR_DELAY_MINUTES = 5
export const SEVERE_DELAY_MINUTES = 15

const StationId = z.string().regex(/^\d+$/)
const NaiveIso = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/)

export const AffectedTrainSchema = z.object({
  trainNumber: z.number().int().nonnegative(),
  status: z.enum(AFFECTED_TRAIN_STATUSES),
  originStationId: StationId,
  destinationStationId: StationId,
  /** Scheduled departure from the origin / arrival at the destination. */
  departureTime: NaiveIso,
  arrivalTime: NaiveIso,
  /** Whole minutes late, clamped to >= 0 (Israel Railways trains never run early). */
  delayMinutes: z.number().int().nonnegative(),
  /** The next scheduled stop the train has not reached yet, when it is on its way. */
  nextStationId: StationId.optional(),
  /** For curtailed runs: where the train now terminates instead of `destinationStationId`. */
  actualDestinationStationId: StationId.optional(),
  /** For runs skipping stops: the stations the train will not call at. */
  skippedStationIds: z.array(StationId).optional(),
})

export const DisruptionSectionSchema = z.object({
  fromStationId: StationId,
  toStationId: StationId,
  /** Every station of the stretch, inclusive, in the line's station order. */
  stationIds: z.array(StationId).min(1),
})

export const DisruptionSchema = z.object({
  /** Stable within a response (kind + section), for list keys. */
  id: z.string(),
  kind: z.enum(DISRUPTION_KINDS),
  /** What this disruption alone would make the line's level. */
  level: z.enum(SERVICE_STATUS_LEVELS),
  /** The stretch of the line the map should flag; null when it concerns the whole line or single trains. */
  section: DisruptionSectionSchema.nullable(),
  trains: z.array(AffectedTrainSchema),
})

export const LineStatusSchema = z.object({
  /** Catalogue line id (see status/lines.ts), e.g. "2" for Binyamina – Ashkelon. */
  lineId: z.string(),
  level: z.enum(SERVICE_STATUS_LEVELS),
  /** Worst first. Empty when the service is good (or there is no data). */
  disruptions: z.array(DisruptionSchema),
  trains: z.object({
    /** Runs whose schedule overlaps the status window. */
    active: z.number().int().nonnegative(),
    delayed: z.number().int().nonnegative(),
    cancelled: z.number().int().nonnegative(),
    maxDelayMinutes: z.number().int().nonnegative(),
  }),
  /** Catalogue echo so a client with an older line catalogue can still render the row. */
  line: z.object({
    badge: z.string(),
    color: z.string(),
    name: z.object({ he: z.string(), en: z.string() }),
    stationIds: z.array(StationId),
  }),
})

export const ServiceStatusSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  /** Real UTC time the response was computed. */
  generatedAt: z.string(),
  /** The Israel civil date the status describes. */
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  realtime: z.object({
    /** False when the SIRI snapshot is missing or stale — every line is then `unknown` or `noService`. */
    available: z.boolean(),
    /** Real UTC time of the poll behind the snapshot, when there is one. */
    updatedAt: z.string().nullable(),
  }),
  network: z.object({
    /** The worst level of any line that has service right now. */
    level: z.enum(SERVICE_STATUS_LEVELS),
    counts: z.record(z.enum(SERVICE_STATUS_LEVELS), z.number().int().nonnegative()),
  }),
  /** One entry per catalogue line, in catalogue order. */
  lines: z.array(LineStatusSchema),
})

export type AffectedTrain = z.infer<typeof AffectedTrainSchema>
export type DisruptionSection = z.infer<typeof DisruptionSectionSchema>
export type Disruption = z.infer<typeof DisruptionSchema>
export type LineStatus = z.infer<typeof LineStatusSchema>
export type ServiceStatusSnapshot = z.infer<typeof ServiceStatusSnapshotSchema>

/** Compare two levels: positive when `a` is worse than `b`. */
export const compareLevels = (a: ServiceStatusLevel, b: ServiceStatusLevel): number =>
  SERVICE_STATUS_LEVELS.indexOf(a) - SERVICE_STATUS_LEVELS.indexOf(b)
