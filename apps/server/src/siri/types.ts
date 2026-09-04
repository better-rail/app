/**
 * types.ts — shapes for the MOT SIRI-SM v2.8 realtime pipeline.
 *
 * Only the response fields we actually read are modeled. SIRI-Lite JSON mirrors
 * the XML hierarchy, but producers vary in how they encode "ref" fields (bare
 * string, number, or `{ value: ... }`) and single-element containers may be
 * objects rather than arrays — client.ts normalizes both into NormalizedVisit,
 * which is what the rest of the pipeline consumes.
 */

/** One MonitoredStopVisit flattened to the fields we use. All refs are strings. */
export type NormalizedVisit = {
  /** The monitored stop's code (GTFS stop_code, NOT stop_id). */
  monitoringRef: string
  /** = GTFS route_id. */
  lineRef?: string
  /** MOT direction 1/2/3 — useless for rail, kept for unmatched-sample logs. */
  directionRef?: string
  /** The trip's service date, "YYYY-MM-DD". */
  dataFrameRef?: string
  /** Opaque MOT trip id (TripIdToDate.txt is gone, so not resolvable). */
  datedVehicleJourneyRef?: string
  /** For rail this may carry the train number — only production data can tell. */
  publishedLineName?: string
  /** Origin / destination stop codes. */
  originRef?: string
  destinationRef?: string
  /** Scheduled journey start, ISO with +02/+03 offset. */
  originAimedDeparture?: string
  vehicleRef?: string
  location?: { lat: number; lon: number }
  /** MonitoredCall fields for the monitored stop. */
  expectedArrival?: string
  aimedArrival?: string
  arrivalStatus?: string
  arrivalPlatform?: string
}

/** A journey we couldn't correlate to a GTFS trip — captured for remote debugging. */
export type UnmatchedSample = {
  reason: string
  monitoringRef: string
  lineRef?: string
  directionRef?: string
  dataFrameRef?: string
  datedVehicleJourneyRef?: string
  publishedLineName?: string
  originRef?: string
  destinationRef?: string
  originAimedDeparture?: string
}

// --- the snapshot the poller publishes to redis -------------------------------

/** Realtime info for one train at one monitored station. */
export type StationRealtime = {
  /** Minutes vs the scheduled arrival; null when unusable (cancelled/noReport/no prediction). */
  delayMin: number | null
  /** Expected arrival as a naive wall-clock epoch (gtfs-time convention), for delay ordering. */
  expectedArr?: number
  /** Live platform from ArrivalPlatformName (only when it parses to a positive number). */
  platform?: number
  /** ArrivalStatus verbatim (onTime/early/delayed/cancelled/arrived/noReport). */
  status?: string
  /**
   * Naive epoch ms of the cycle that started carrying this entry forward after
   * its visit left the feed (the train departed the stop). Absent = live in the
   * latest poll. Carried entries expire siriCarrySeconds after this.
   */
  seenAt?: number
}

export type TrainRealtime = {
  routeId: string
  /** Delay at the nearest upcoming monitored stop — the value mid-ride lookups fall back to. */
  latestDelayMin: number
  /** Keyed by rail_id (3700-style station id). */
  stations: Record<string, StationRealtime>
  /** Every monitored station reports cancelled (2+ stations) — the whole run is cancelled. */
  cancelled?: boolean
  /** Live destination (rail_id) from DestinationRef, only when it differs from the schedule. */
  liveDestRailId?: number
  location?: { lat: number; lon: number }
  vehicleRef?: string
  /** The train left the feed (run over / out of the preview window); everything here is frozen last-known state. */
  ended?: boolean
}

export type SiriSnapshot = {
  /** Real epoch ms of the poll that produced this snapshot (staleness checks). */
  updatedAt: number
  feedId: string
  /** Keyed by `${serviceDate}#${trainNumber}`. */
  trains: Record<string, TrainRealtime>
}

// --- the lookup injected into the planner --------------------------------------

export type RealtimeInfo = {
  /** Minutes late, clamped to >= 0. */
  delayMin: number
  /** Live platform override, when SIRI reported one for this station. */
  platform?: number
  /** ArrivalStatus at this station, when monitored (onTime/early/delayed/cancelled/arrived/noReport). */
  status?: string
  /** Train-level (same value for every station of the train): the whole run is cancelled. */
  trainCancelled?: boolean
  /** Train-level: live destination rail_id when SIRI reports a different last stop. */
  liveDestRailId?: number
}

export type RealtimeLookup = (serviceDate: string, trainNumber: number, railId: number) => RealtimeInfo
