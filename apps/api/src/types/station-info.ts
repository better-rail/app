/**
 * The station information contract — what `GET /api/v1/stations/:id/info` returns.
 *
 * Mirrored in the app (apps/mobile/src/services/api/station-info.types.ts) — keep the two
 * in sync. It is the Israel Railways station page, cleaned up: the entrances with their
 * opening hours and the hours of the ticket office and the customer-service desk, the
 * facilities at each, notices about the station, and parking.
 */

export type StationInfoLocale = "he" | "en" | "ru" | "ar"

/** Whose hours these are: the entrance's gates, the ticket office, or the customer-service desk. */
export type StationHoursKind = "entrance" | "ticketOffice" | "customerService"

export type StationHours = {
  kind: StationHoursKind
  /** Days of the week these hours apply to: 1 = Sunday … 7 = Saturday. */
  days: number[]
  /** "HH:mm"; null when closed all day or open around the clock. A closing time before the opening time is past midnight. */
  opens: string | null
  closes: string | null
  /** Open around the clock. */
  allDay: boolean
  /** Closed all day. */
  closed: boolean
  /** Something the page says beside the hours ("intermittently"), as it says it. */
  note: string | null
}

export type StationEntrance = {
  id: number
  name: string
  address: string | null
  location: { lat: number; lon: number } | null
  hours: StationHours[]
  /** Facilities at the entrance, named as the page names them ("Ticket machines", "Public toilets"). */
  services: string[]
  /** Elevators out of service, as the page puts it; null when it says nothing. */
  inactiveElevators: string | null
}

/** A notice about the station on its page ("the northern entrance opens…"). */
export type StationNotice = {
  id: string
  /** "dd.MM.yyyy" as the page gives it; null when missing. */
  date: string | null
  header: string
  content: string
  link: string | null
  /** The page's category ("Special", "Permanent"…). */
  type: string
}

export type StationInfo = {
  schemaVersion: 1
  stationId: string
  locale: StationInfoLocale
  name: string
  /** When the whole station is closed: until when (an ISO date, or null) and what the page says about it. */
  closed: { until: string | null; text: string | null } | null
  notices: StationNotice[]
  parking: { car: string | null; carCost: string | null; bike: string | null; bikeCost: string | null }
  entrances: StationEntrance[]
  /** The station's page on the Israel Railways site. */
  link: string
  /** When this was read from Israel Railways. */
  fetchedAt: string
}
