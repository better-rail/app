/**
 * station-info.ts — a station's page from the Israel Railways API, cleaned up.
 *
 * `GetStationInformation` is the endpoint the app's old "station hours" sheet read.
 * It answers with the station page as the site renders it: every entrance with its
 * gate hours plus those of the ticket office and the customer-service desk (numbered
 * activity types, replace-texts like "24 hours" and "Closed" in the page's language),
 * the facilities at each, notices and parking. This
 * turns it into the StationInfo contract (types/station-info.ts) the app renders.
 */
import type {
  StationEntrance,
  StationHours,
  StationHoursKind,
  StationInfo,
  StationInfoLocale,
  StationNotice,
} from "../types/station-info"
import { railApiFetch } from "./rail-api"

// --- the API's shapes (only what is read) --------------------------------------------

type RailActivityHours = {
  activityHoursType: number
  isClosedShortText: string | null
  activityDaysNumbers: string | null
  startHour: string | null
  endHour: string | null
  startHourTextKey: string | null
  startHourReplaceTextKey: string | null
  endHourPrefixTextKey: string | null
  endHourReplaceTextKey: string | null
  endHourPostfixTextKey: string | null
  activityHoursReplaceTextKey: string | null
}

type RailGate = {
  stationGateId: number
  gateName: string | null
  gateAddress: string | null
  gateLatitude: number | null
  gateLontitude: number | null
  gateActivityHours: RailActivityHours[] | null
  gateServices: { serviceName: string | null }[] | null
  nonActiveElavators: string | null
}

type RailStationUpdate = {
  updateId: string | null
  date: string | null
  updateHeader: string | null
  updateContent: string | null
  updateLink: string | null
  updateType: string | null
}

export type RailStationInfo = {
  stationUpdates: RailStationUpdate[] | null
  stationDetails: {
    stationId: number
    stationName: string | null
    carParking: string | null
    parkingCosts: string | null
    bikeParking: string | null
    bikeParkingCosts: string | null
    nonActiveElevators: string | null
    stationIsClosed: boolean
    stationIsClosedUntill: string | null
    stationIsClosedText: string | null
  } | null
  gateInfo: RailGate[] | null
}

type RailEnvelope = { result: RailStationInfo | null }

const RAIL_LOCALES: Record<StationInfoLocale, string> = { he: "Hebrew", en: "English", ru: "Russian", ar: "Arabic" }

/** The page's numbered activity types. 1 is the gates (what the old sheet showed); 2 and 3 are read off the site. */
const HOURS_KINDS: Record<number, StationHoursKind> = { 1: "entrance", 2: "ticketOffice", 3: "customerService" }

// --- text ------------------------------------------------------------------------------

const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
}

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity.toLowerCase()] ?? match
  })

/** Whitespace folded, zero-width and soft characters dropped. */
export const clean = (text: string | null | undefined): string =>
  (text ?? "")
    .replace(/[​-‍﻿­]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** HTML from the page as plain text: paragraphs and breaks become line breaks, everything else is dropped. */
export const htmlToText = (html: string | null | undefined): string =>
  decodeEntities((html ?? "").replace(/<\s*\/?\s*(br|p|div|li|h\d)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, ""))
    .replace(/[​-‍﻿­]/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim()

const orNull = (text: string | null | undefined): string | null => {
  const value = clean(text)
  return value ? value : null
}

// --- hours -----------------------------------------------------------------------------

/** "7:00" / "07:00:00" → "07:00"; anything else null. */
export const clockOf = (text: string | null | undefined): string | null => {
  const match = /^\s*(\d{1,2}):(\d{2})/.exec(text ?? "")
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return `${String(hours).padStart(2, "0")}:${match[2]}`
}

const CLOSED_WORDS = /closed|סגור|закрыт|مغلق/i
const ALL_DAY_WORDS = /24/

const parseDays = (text: string | null): number[] =>
  [...new Set((text ?? "").split(",").map((d) => Number(d.trim())))].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b)

/** One row of the page's hours table as StationHours; null for an activity type the contract has no name for, or a row with no days. */
export const normalizeHours = (row: RailActivityHours): StationHours | null => {
  const kind = HOURS_KINDS[row.activityHoursType]
  if (!kind) return null
  const days = parseDays(row.activityDaysNumbers)
  if (days.length === 0) return null

  const replace = clean(row.activityHoursReplaceTextKey)
  const opens = clockOf(row.startHour)
  const closes = clockOf(row.endHour)
  const allDay = ALL_DAY_WORDS.test(replace)
  // "Closed" in the page's language, or an empty 00:00–00:00 span.
  const closed = !allDay && (CLOSED_WORDS.test(replace) || (opens === "00:00" && closes === "00:00") || !opens || !closes)
  const notes = [
    row.startHourTextKey,
    row.startHourReplaceTextKey,
    row.endHourPrefixTextKey,
    row.endHourReplaceTextKey,
    row.endHourPostfixTextKey,
    // A replace-text that is neither "closed" nor "24 hours" is a note in its own right.
    allDay || CLOSED_WORDS.test(replace) ? null : replace,
  ]
  const note = [...new Set(notes.map(clean).filter(Boolean))].join(" · ")

  return {
    kind,
    days,
    opens: allDay || closed ? null : opens,
    closes: allDay || closed ? null : closes,
    allDay,
    closed,
    note: note || null,
  }
}

const normalizeEntrance = (gate: RailGate): StationEntrance => {
  const lat = Number(gate.gateLatitude)
  const lon = Number(gate.gateLontitude)
  const located = Number.isFinite(lat) && Number.isFinite(lon) && lat !== 0 && lon !== 0
  return {
    id: gate.stationGateId,
    name: clean(gate.gateName),
    address: orNull(gate.gateAddress),
    location: located ? { lat, lon } : null,
    hours: (gate.gateActivityHours ?? []).map(normalizeHours).filter((h): h is StationHours => h !== null),
    services: [...new Set((gate.gateServices ?? []).map((s) => clean(s.serviceName)).filter(Boolean))],
    inactiveElevators: orNull(gate.nonActiveElavators),
  }
}

const normalizeNotice = (update: RailStationUpdate, index: number): StationNotice | null => {
  const header = clean(update.updateHeader)
  const content = htmlToText(update.updateContent)
  if (!header && !content) return null
  return {
    id: update.updateId || `notice-${index}`,
    date: orNull(update.date),
    header,
    content,
    link: orNull(update.updateLink),
    type: clean(update.updateType) || "Info",
  }
}

/** The page's "closed until" date; the API sends year 1 when the station is open. */
const closedUntil = (text: string | null): string | null => {
  if (!text || text.startsWith("0001-")) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export const stationPageLink = (stationId: string): string => `https://www.rail.co.il/?page=stationinfo&stationname=${stationId}`

/** The API's station page as the StationInfo contract. */
export const normalizeStationInfo = (
  raw: RailStationInfo,
  stationId: string,
  locale: StationInfoLocale,
  fetchedAt: Date = new Date(),
): StationInfo => {
  const details = raw.stationDetails
  return {
    schemaVersion: 1,
    stationId,
    locale,
    name: clean(details?.stationName),
    closed: details?.stationIsClosed
      ? { until: closedUntil(details.stationIsClosedUntill), text: orNull(details.stationIsClosedText) }
      : null,
    notices: (raw.stationUpdates ?? []).map(normalizeNotice).filter((n): n is StationNotice => n !== null),
    parking: {
      car: orNull(details?.carParking),
      carCost: orNull(details?.parkingCosts),
      bike: orNull(details?.bikeParking),
      bikeCost: orNull(details?.bikeParkingCosts),
    },
    entrances: (raw.gateInfo ?? []).map(normalizeEntrance),
    link: stationPageLink(stationId),
    fetchedAt: fetchedAt.toISOString(),
  }
}

/** The station's page from the API, or null when the API does not know the station. */
export const fetchStationInfo = async (stationId: string, locale: StationInfoLocale): Promise<StationInfo | null> => {
  const response = await railApiFetch(
    `/common/api/v1/Stations/GetStationInformation?LanguageId=${RAIL_LOCALES[locale]}&StationId=${stationId}&SystemType=1`,
    { retries: 2 },
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GetStationInformation ${stationId}/${locale}: HTTP ${response.status}`)
  const body = (await response.json()) as RailEnvelope
  // An unknown station comes back as a page with no details.
  if (!body.result || !body.result.stationDetails || !body.result.stationDetails.stationName) return null
  return normalizeStationInfo(body.result, stationId, locale)
}
