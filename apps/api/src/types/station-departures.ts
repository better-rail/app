/**
 * The station departures contract — what `GET /api/v1/stations/:id/departures` returns.
 *
 * Mirrored in the app (apps/mobile/src/services/api/station-departures.types.ts) — keep the
 * two in sync. The next trains calling at a station, per line and per direction, the way a
 * platform board lists them: scheduled time, live delay, platform, and where the train ends.
 */

export type StationDeparture = {
  trainNumber: number
  /** The scheduled time the rider can board, as a naive wall-clock ISO string ("2026-09-13T15:42:00"). */
  time: string
  /** Minutes late per the live feed; 0 when on time or unknown. */
  delayMinutes: number
  /** Live platform when reported, else the scheduled one; 0 when unknown. */
  platform: number
  /** Where the train ends, as a "3700"-style station id; the live destination when it was curtailed. */
  destinationStationId: string
  cancelled: boolean
  /** The live feed has seen this train. */
  live: boolean
}

export type StationDepartureDirection = {
  /** The line's terminus the trains head for, as a "3700"-style station id. */
  towardsStationId: string
  /** Soonest first. */
  trains: StationDeparture[]
}

export type StationLineDepartures = {
  lineId: string
  directions: StationDepartureDirection[]
}

export type StationDepartures = {
  schemaVersion: 1
  stationId: string
  /** Real UTC time. */
  generatedAt: string
  realtime: { available: boolean }
  /** Lines with a train calling within the window, in catalogue order. */
  lines: StationLineDepartures[]
}
