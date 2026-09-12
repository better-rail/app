/**
 * extraction.ts — Israel Railways' service updates, read by an LLM into the
 * status schema.
 *
 * The updates are prose ("due to life-saving infrastructure works near Zevulun,
 * on Thursday–Saturday 20–22.8.26 the stations Nahariya, Akko, … will be closed;
 * free shuttles will run"). The model turns each into structured disruptions:
 * what kind, which stations, when, why, and what Israel Railways offers instead.
 * Everything it returns is then checked against the line catalogue here, so a
 * misread station id or an impossible window never reaches the map.
 *
 * Two halves, so the tests can run without a model:
 * - `extractDisruptions` builds the prompt and calls OpenAI (structured output);
 * - `normalizeExtraction` and `announcedDisruptionsForLine` are pure.
 */
import { createHash } from "node:crypto"
import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { openaiApiKey, openaiModel, openaiReasoningEffort } from "../data/config"
import { stations } from "../data/stations"
import { logNames, logger } from "../logs"
import {
  type Disruption,
  type DisruptionSection,
  type LocalizedText,
  LocalizedTextSchema,
  type ServiceStatusLevel,
  TRANSPORT_MODES,
  type TravelAlternative,
} from "../types/service-status"
import { RAIL_LINES, type RailLineDefinition, type RailLineId } from "../status/lines"

// --- what the model is given ---------------------------------------------------------

/** One Israel Railways update, in Hebrew (the canonical text) and English when the API has it. */
export type AnnouncementItem = {
  id: string
  /** As the API dates it, "DD.MM.YYYY" — unreliable (a template date, often), given to the model as a hint only. */
  date: string
  link: string | null
  /** Stations the API tags the update with; usually empty. */
  stationIds: string[]
  he: { header: string; content: string }
  en?: { header: string; content: string }
}

// --- what the model returns ------------------------------------------------------------

/** Kinds an announcement can be read as; delays, cancellations and curtailments stay realtime's. */
export const ANNOUNCED_KINDS = ["suspension", "skippedStops"] as const

export type AnnouncedKind = (typeof ANNOUNCED_KINDS)[number]

// Strict structured output: every field required, `null` where there is nothing to say.
const NaiveIsoDescription = 'Israel local wall-clock time as "YYYY-MM-DDTHH:MM:SS", no timezone'

const WindowSchema = z.object({
  from: z.string().describe(`When the disruption starts. ${NaiveIsoDescription}.`),
  to: z
    .string()
    .nullable()
    .describe(`When service resumes. ${NaiveIsoDescription}. null only when the update gives no end at all.`),
})

const ExtractedAlternativeSchema = z.object({
  mode: z.enum(TRANSPORT_MODES).describe("shuttle = Israel Railways' own replacement buses (היסעים); bus = public bus lines"),
  free: z.boolean().describe("true when the update says it costs nothing (ללא עלות)"),
  description: LocalizedTextSchema.describe("One short sentence: what runs, between where. Same meaning in every language."),
})

const ExtractedDisruptionSchema = z.object({
  sourceIds: z.array(z.string()).describe("ids of every update this disruption comes from"),
  kind: z.enum(ANNOUNCED_KINDS),
  fromStationId: z.string().nullable().describe("suspension: one end of the stretch with no trains (catalogue station id)"),
  toStationId: z.string().nullable().describe("suspension: the other end of the stretch (catalogue station id)"),
  stationIds: z.array(z.string()).describe("skippedStops: the closed stations trains pass without stopping (catalogue ids)"),
  lineIds: z
    .array(z.string())
    .describe(
      "Every catalogue line the disruption affects, from the STATIONS index (lines calling at the stations), minus lines the update says run normally. Never empty.",
    ),
  windows: z.array(WindowSchema).describe("Every period it is in force; one per weekend for recurring works."),
  reason: LocalizedTextSchema.describe("Why, in a short phrase without dates or station names, in all four languages."),
  alternatives: z.array(ExtractedAlternativeSchema),
  link: z.string().nullable().describe("The update's link, when it has one."),
  confidence: z.enum(["high", "medium", "low"]),
  note: z.string().describe("One line in English on how it was read, for the logs."),
})

export const ExtractionSchema = z.object({
  disruptions: z.array(ExtractedDisruptionSchema),
})

export type ExtractedDisruption = z.infer<typeof ExtractedDisruptionSchema>
export type Extraction = z.infer<typeof ExtractionSchema>

// --- what the status derivation keeps --------------------------------------------------

export type AnnouncedWindow = { from: string; to: string | null }

/** An announced disruption after validation: catalogue ids only, windows in order. */
export type AnnouncedDisruption = {
  /** Stable for the same announcement: the kind, stations and first window. */
  id: string
  kind: AnnouncedKind
  /** For a suspension: the two ends of the stretch. */
  fromStationId?: string
  toStationId?: string
  /** For skipped stops: the closed stations. */
  stationIds: string[]
  /** Only these lines, when the announcement names some; otherwise every line through the stations. */
  lineIds: RailLineId[]
  windows: AnnouncedWindow[]
  reason: LocalizedText
  alternatives: TravelAlternative[]
  link?: string
  sourceIds: string[]
}

/** An open-ended window is not trusted past this: Israel Railways drops resolved updates, but not always promptly. */
export const OPEN_ENDED_WINDOW_MS = 24 * 60 * 60_000

const NAIVE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/
const naiveMs = (iso: string): number => Date.parse(`${iso}Z`)

const stationById = new Map(stations.map((s) => [s.id, s]))
const lineIds = new Set<string>(RAIL_LINES.map((l) => l.id))

const shortHash = (parts: string[]): string => createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 10)

/**
 * The model's output checked against the catalogue. Whatever does not fit is dropped
 * (and logged), never guessed: a disruption on the map has to be right.
 */
export const normalizeExtraction = (extraction: Extraction, nowNaiveMs: number): AnnouncedDisruption[] => {
  const out: AnnouncedDisruption[] = []
  for (const d of extraction.disruptions) {
    const drop = (why: string) =>
      logger?.warn(logNames.announcements.dropped, { why, kind: d.kind, note: d.note, sources: d.sourceIds })

    if (d.confidence === "low") {
      drop("low confidence")
      continue
    }

    const windows: AnnouncedWindow[] = []
    for (const w of d.windows) {
      if (!NAIVE_ISO.test(w.from) || (w.to !== null && !NAIVE_ISO.test(w.to))) continue
      if (w.to !== null && naiveMs(w.to) <= naiveMs(w.from)) continue
      // Over already: nothing to show.
      if (windowEndMs(w) <= nowNaiveMs) continue
      windows.push({ from: w.from, to: w.to })
    }
    windows.sort((a, b) => naiveMs(a.from) - naiveMs(b.from))
    if (windows.length === 0) {
      drop("no usable window")
      continue
    }

    const link = d.link && /^https?:\/\//.test(d.link) ? d.link : undefined
    const base = {
      lineIds: [] as RailLineId[],
      windows,
      reason: d.reason,
      alternatives: d.alternatives,
      link,
      sourceIds: d.sourceIds,
    }

    if (d.kind === "suspension") {
      const from = d.fromStationId ?? ""
      const to = d.toStationId ?? ""
      if (!stationById.has(from) || !stationById.has(to) || from === to) {
        drop(`suspension ends unknown: ${from}–${to}`)
        continue
      }
      // Nothing in the catalogue runs that stretch: a misread, or a stretch the map does not have.
      if (!RAIL_LINES.some((line) => line.stationIds.includes(from) && line.stationIds.includes(to))) {
        drop(`no line runs ${from}–${to}`)
        continue
      }
      out.push({
        id: `announcement:${shortHash(["suspension", from, to, windows[0].from])}`,
        kind: "suspension",
        fromStationId: from,
        toStationId: to,
        stationIds: [],
        ...base,
        lineIds: linesNamed(d, (line) => line.stationIds.includes(from) && line.stationIds.includes(to)),
      })
      continue
    }

    const closed = [...new Set(d.stationIds)].filter((id) => stationById.has(id))
    if (closed.length === 0) {
      drop("no known closed station")
      continue
    }
    out.push({
      id: `announcement:${shortHash(["skippedStops", ...closed, windows[0].from])}`,
      kind: "skippedStops",
      stationIds: closed,
      ...base,
      lineIds: linesNamed(d, (line) => closed.some((id) => line.stationIds.includes(id))),
    })
  }
  return out
}

/**
 * The lines the model named that really run the stations, as the restriction to apply. Naming
 * none that does (or none at all) means no restriction: every line through the stations. The
 * model is asked to always name them, so an empty answer is logged as a prompt miss.
 */
const linesNamed = (d: ExtractedDisruption, runs: (line: RailLineDefinition) => boolean): RailLineId[] => {
  const named = RAIL_LINES.filter((line) => d.lineIds.includes(line.id))
  const valid = named.filter(runs).map((line) => line.id)
  if (valid.length === 0) logger?.warn(logNames.announcements.linesUnnamed, { lineIds: d.lineIds, note: d.note })
  return valid
}

const windowEndMs = (w: AnnouncedWindow): number => (w.to === null ? naiveMs(w.from) + OPEN_ENDED_WINDOW_MS : naiveMs(w.to))

/** The window in force at `nowNaiveMs`, if any. */
export const activeWindow = (d: AnnouncedDisruption, nowNaiveMs: number): AnnouncedWindow | undefined =>
  d.windows.find((w) => naiveMs(w.from) <= nowNaiveMs && nowNaiveMs < windowEndMs(w))

/** The stretch of `line` between two of its stations, inclusive, in the line's order — or nothing when either is off it. */
const stretchOf = (line: RailLineDefinition, a: string, b: string): DisruptionSection | undefined => {
  const i = line.stationIds.indexOf(a)
  const j = line.stationIds.indexOf(b)
  if (i < 0 || j < 0) return undefined
  const stationIds = line.stationIds.slice(Math.min(i, j), Math.max(i, j) + 1)
  return { fromStationId: stationIds[0], toStationId: stationIds[stationIds.length - 1], stationIds }
}

/**
 * The announced disruptions in force on `line` right now, as the status schema has them.
 * A suspension of the line's whole corridor makes it `suspended`, of part of it `partSuspended`;
 * closed stations count as `minorDelays`, as skipped stops do from the live feed.
 */
export const announcedDisruptionsForLine = (
  line: RailLineDefinition,
  announced: AnnouncedDisruption[],
  nowNaiveMs: number,
): Disruption[] => {
  const out: Disruption[] = []
  for (const d of announced) {
    if (d.lineIds.length > 0 && !d.lineIds.includes(line.id)) continue
    const window = activeWindow(d, nowNaiveMs)
    if (!window) continue

    let section: DisruptionSection | undefined
    let level: ServiceStatusLevel
    if (d.kind === "suspension") {
      section = stretchOf(line, d.fromStationId as string, d.toStationId as string)
      if (!section) continue
      level = section.stationIds.length === line.stationIds.length ? "suspended" : "partSuspended"
    } else {
      const closed = line.stationIds.filter((id) => d.stationIds.includes(id))
      if (closed.length === 0) continue
      section = { fromStationId: closed[0], toStationId: closed[closed.length - 1], stationIds: closed }
      level = "minorDelays"
    }

    out.push({
      id: d.id,
      kind: d.kind,
      level,
      section,
      trains: [],
      source: "announcement",
      reason: d.reason,
      alternatives: d.alternatives,
      link: d.link,
      validity: { from: window.from, to: window.to },
    })
  }
  return out
}

// --- the prompt ----------------------------------------------------------------------

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

/**
 * The catalogue as the model sees it: every line with its stations in order (ids with Hebrew and
 * English names), then every station with the lines calling at it — the index the model reads
 * `lineIds` off.
 */
export const catalogueText = (): string => {
  const label = (id: string): string => {
    const station = stationById.get(id)
    return station ? `${id} ${station.hebrew} (${station.english})` : id
  }
  const lines = RAIL_LINES.map(
    (line) =>
      `line ${line.id} — ${line.name.he} / ${line.name.en}, ${line.stationIds.length} stations:\n  ${line.stationIds
        .map(label)
        .join(" › ")}`,
  )
  const index = stations
    .map((s) => {
      const through = RAIL_LINES.filter((line) => line.stationIds.includes(s.id)).map((line) => line.id)
      if (through.length === 0) return undefined
      const aliases = s.alias?.length ? ` | also: ${s.alias.join(", ")}` : ""
      return `${s.id} ${s.hebrew} | ${s.english}${aliases} → lines ${through.join(", ")}`
    })
    .filter((row): row is string => row !== undefined)
  return `LINES — catalogue id, name, and the stations in order (station id, Hebrew name, English name). A line's trains call at these stations and no others; the first and last are its termini.
${lines.join("\n")}

STATIONS — station id, names, and the catalogue lines calling there. Only the ids listed here exist.
${index.join("\n")}`
}

export const systemPrompt = (nowNaiveMs: number): string => {
  const now = new Date(nowNaiveMs)
  const nowIso = now.toISOString().slice(0, 19)
  return `You read Israel Railways' published service updates (Hebrew, sometimes with an English version) and extract the disruptions to train service they describe, for a live status map of the network. You answer only with the structured output.

NOW: ${nowIso} Israel local time, a ${WEEKDAYS[now.getUTCDay()]}. All times you output are Israel local wall-clock time in the same "YYYY-MM-DDTHH:MM:SS" form, never UTC.

WHAT COUNTS AS A DISRUPTION
- kind "suspension": no trains on a stretch of line, for any reason — planned works ("תופסק תנועת הרכבות בין תחנות X ו-Y"), trains starting and ending short of their usual terminus ("הרכבות יתחילו ויסיימו את נסיעתן בתחנת X" → the stretch beyond X has no service), a whole line not running, an unplanned stop of traffic (fire, power failure, security). fromStationId/toStationId are the two ends of the stretch, as catalogue ids. When the update names the stretch by a station and a direction ("בין חיפה מרכז לכיוון הצפון"), the far end is the last station of the catalogue line in that direction.
- kind "skippedStops": stations closed to service while trains still run through them ("תחנות X, Y ו-Z תיסגרנה לשירות"). stationIds lists the closed stations. When the same update also suspends a stretch, the stations on that stretch belong to the suspension, not here; list only the closed stations outside it.
- One update can yield several disruptions (a suspended stretch plus closed stations on a branch; different scopes on different days). Several updates about the same works yield ONE disruption with every sourceId.

WHAT DOES NOT COUNT — return nothing for these
- extra trains for concerts, matches and festivals; holiday, Shabbat and daylight-saving timetables; new lines, new stations, more frequent trains; fares, refunds, vouchers, free travel, app validation; escalators, elevators, entrances, access paths and station-facility works, especially when the update says train traffic is unaffected ("אין שינוי בתנועת הרכבות"); general information pages ("מידע על מערך ההיסעים"); an update saying traffic has resumed ("חודשה תנועת הרכבות") ends a disruption rather than creating one.
- passenger caps and voucher schemes on the Jerusalem line are not disruptions.

WINDOWS
- One window per continuous period. Recurring works (several weekends) are several windows on one disruption.
- Dates are day.month.year, e.g. 20.8.26 is 2026-08-20; a date without a year is the next occurrence from NOW.
- "החל מהלילה שבין רביעי לחמישי בשעה 00:01" starts Thursday 00:01. "עד יום ראשון בשעה 04:00 עם חידוש השירות" ends Sunday 04:00. "ביום שישי בלבד" runs Friday 00:00 to Saturday 04:00. "מוצ"ש" starts Saturday 20:00. "החל מהשעה 22:00 בקירוב" starts at 22:00 that day. When an end is given only as a day, use 04:00 of the following day (traffic returns to normal at 04:00). When works "return to normal on Sunday at 04:00", every window of that weekend ends then.
- A weekend listed day by day is ONE window when the days touch. "חמישי 27.8 החל מהשעה 22:00", "שישי 28.8 כולל רכבות הלילה שבין חמישי לשישי" and "מוצ"ש 29.8 כולל רכבות הלילה שבין מוצ"ש לראשון", with traffic back to normal on Sunday at 04:00, is one window 2026-08-27T22:00:00 to 2026-08-30T04:00:00 — do not split it at Shabbat, when no trains run anyway. A stand-alone "מוצ"ש 22.8" the weekend before is its own window, Saturday 20:00 to Sunday 04:00.
- Give "to" whenever the update lets you infer it; null only for an unplanned stop with no end at all.
- Skip windows that ended before NOW.

STATIONS AND LINES
- Line ids ("1", "3X", "12" …) are this system's internal keys. Israel Railways publishes no line numbers, and passengers never see these ids; updates name a line by its termini ("קו מודיעין – ירושלים", "קו העמק"). Resolve such names through the LINES list below (by termini and stations), never by any number in the text.
- Use catalogue station ids only, from the STATIONS index below. Resolve nicknames and abbreviations there (ת"א = תל אביב, פ"ת = פתח תקווה, ראשל"צ = ראשון לציון, "חיפה מרכז" = חיפה מרכז השמונה, "אשדוד" = אשדוד עד הלום, "מרכזית המפרץ" = HaMifrats Central, "קו העמק" = the Valley line, line 11, Beit She'an to Atlit). Never invent an id.
- lineIds is REQUIRED and never empty: every catalogue line the disruption affects. Read it off the STATIONS index — for a suspension, the lines listed at BOTH ends of the stretch (the lines that run the whole stretch); for closed stations, the lines listed at any of the stations. Then remove a line the update says keeps running ("קו מודיעין-ירושלים יפעל כסדרו" removes line 10). Do not infer lines from names or geography; the index is the only source.
- A stretch named by a station and a direction ("בין חיפה מרכז לכיוון הצפון") runs to the end of each line in that direction, and the lines fan out: give one suspension per branch, each with its own far end and lineIds. North of Haifa Center (2100) that is the Nahariya branch (to 1600: lines 1, 3), the Karmiel branch (to 1840: lines 3X, 4) and the Valley branch (to 1280: line 11).
- Worked example. "תופסק תנועת הרכבות בין חיפה מרכז לכיוון הצפון … הרכבות יתחילו ויסיימו את נסיעתן בתחנת חיפה מרכז השמונה. תחנות סגורות לשירות: נהריה, עכו, קריית מוצקין, קריית חיים, חוצות המפרץ, מרכזית המפרץ, כרמיאל, אחיהוד, וקו העמק" yields three suspensions, all with the same windows, reason and alternatives: 2100→1600 with lineIds ["1", "3"]; 2100→1840 with lineIds ["3X", "4"]; 2100→1280 with lineIds ["11"]. The closed stations all lie on those stretches, so no skippedStops entry is needed.

REASON AND ALTERNATIVES
- reason: a label of a few words (at most five or so in each language) on why, as the update gives it, without dates or station names: "עבודות תשתית מצילות חיים", "שריפה בקרבת המסילה", "תקלה בתשתית החשמל". Keep the name the update gives the works — a project, a line, a place — because passengers know them by it, but as a label, not a sentence: "עבודות מסילת 431" / "Line 431 works", "חשמול קו העמק" / "Valley line electrification", not "חיבור מסילת 431 לרשת המסילות הארצית". Drop qualifiers that add no information ("החיוניות לבטיחות הנסיעה"). Give the same meaning in Hebrew, English, Russian and Arabic.
- reason and every alternative description are shown to passengers as a line of their own, so write each as a sentence-case phrase: a capital first letter in English and Russian ("Essential maintenance works", "Shuttles from Haifa to the northern stations"), no trailing full stop.
- alternatives: only what the update actually offers. Israel Railways' own replacement buses ("היסעים", "מערך היסעים") are mode "shuttle", free when "ללא עלות"; reinforced public bus lines ("יתוגברו קווי אוטובוס") are mode "bus"; a train routing to use instead ("ניתן לנסוע בקו העובר דרך קריית גת") is mode "train"; light rail is "lightRail". Say between which stations when the update does. Empty when none is offered.
- link: the update's link, if any.
- confidence "low" when you had to guess stations or dates; such disruptions are not shown.

${catalogueText()}`
}

export const userPrompt = (items: AnnouncementItem[]): string => {
  const blocks = items.map((item) => {
    const lines = [
      `id: ${item.id}`,
      `api date: ${item.date}`,
      `link: ${item.link ?? "none"}`,
      `tagged stations: ${item.stationIds.length ? item.stationIds.join(", ") : "none"}`,
      `he: ${item.he.header}\n${item.he.content}`,
    ]
    if (item.en) lines.push(`en: ${item.en.header}\n${item.en.content}`)
    return lines.join("\n")
  })
  return `Israel Railways' current service updates, ${items.length} in all:\n\n${blocks.join("\n\n---\n\n")}`
}

// --- the model call -------------------------------------------------------------------

export type Extractor = (items: AnnouncementItem[], nowNaiveMs: number) => Promise<Extraction>

let client: OpenAI | undefined

/** The disruptions the model reads out of the updates, before validation. */
export const extractDisruptions: Extractor = async (items, nowNaiveMs) => {
  client ??= new OpenAI({ apiKey: openaiApiKey, maxRetries: 2, timeout: 120_000 })
  const response = await client.responses.parse({
    model: openaiModel,
    ...(openaiReasoningEffort ? { reasoning: { effort: openaiReasoningEffort as "low" | "medium" | "high" } } : {}),
    input: [
      { role: "system", content: systemPrompt(nowNaiveMs) },
      { role: "user", content: userPrompt(items) },
    ],
    text: { format: zodTextFormat(ExtractionSchema, "rail_disruptions") },
  })
  const parsed = response.output_parsed
  if (!parsed)
    throw new Error(
      `OpenAI returned no structured output (status ${response.status}, ${response.incomplete_details?.reason ?? "no detail"})`,
    )
  return parsed
}
