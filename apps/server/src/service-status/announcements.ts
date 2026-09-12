/**
 * announcements.ts — the announcements poll loop of the service-status service.
 *
 * The old app showed Israel Railways' "railupdates" feed as a list of notices;
 * the status screens want it as disruptions on the map. Every cycle the feed
 * is fetched and fingerprinted; when it changed, the LLM (extraction.ts) reads
 * the whole list again — all at once, so repeated notices about the same works
 * fold into one disruption — and the result is published to redis (state.ts).
 * An unchanged feed costs no model call, and neither does a restart: the
 * fingerprint in redis is compared first.
 *
 * setTimeout-chaining (never setInterval) makes overlapping cycles impossible;
 * failures back off exponentially and only state *transitions* are logged.
 * Runs inside the service-status service (service-status/main.ts,
 * `bun run service-status`), a separate process like the SIRI poller.
 */
import { createHash } from "node:crypto"

import { announcementsPollSeconds, openaiApiKey, openaiModel } from "../data/config"
import { logNames, logger } from "../logs"
import { isRailApiConfigured, railApiFetch } from "../requests/rail-api"
import { naiveNowMs } from "../siri/correlate"
import { type AnnouncementItem, type Extractor, extractDisruptions, normalizeExtraction } from "./extraction"
import { type AnnouncementsState, readAnnouncementsState, writeAnnouncementsState } from "./state"

const MAX_BACKOFF_MS = 30 * 60_000

// --- the feed ------------------------------------------------------------------------

/** One entry of the Israel Railways "railupdates" feed, as the API returns it. */
type RailUpdate = {
  updateId: string
  date: string
  updateHeader: string
  updateContent: string
  updateLink: string | null
  stations: string[]
  linkText: string
  updateType: string
}

type RailUpdatesEnvelope = { result: RailUpdate[] | null }

const fetchUpdates = async (language: "Hebrew" | "English"): Promise<RailUpdate[]> => {
  const response = await railApiFetch(`/common/api/v1/railupdates/?LanguageId=${language}&SystemType=1`, { retries: 2 })
  if (!response.ok) throw new Error(`railupdates ${language}: HTTP ${response.status}`)
  const body = (await response.json()) as RailUpdatesEnvelope
  return body.result ?? []
}

const clean = (text: string): string => text.replace(/\s+/g, " ").trim()

/** The feed in both languages, merged by update id (English is optional — the API does not always have it). */
export const fetchAnnouncements = async (): Promise<AnnouncementItem[]> => {
  const [he, en] = await Promise.all([
    fetchUpdates("Hebrew"),
    fetchUpdates("English").catch((error) => {
      logger?.warn(logNames.announcements.fetchFailed, { language: "English", error })
      return [] as RailUpdate[]
    }),
  ])
  const english = new Map(en.map((u) => [u.updateId, u]))
  return he
    .filter((u) => u.updateHeader || u.updateContent)
    .map((u) => {
      const item: AnnouncementItem = {
        id: u.updateId,
        date: u.date,
        link: u.updateLink || null,
        stationIds: (u.stations ?? []).map(String),
        he: { header: clean(u.updateHeader ?? ""), content: clean(u.updateContent ?? "") },
      }
      const e = english.get(u.updateId)
      if (e) item.en = { header: clean(e.updateHeader ?? ""), content: clean(e.updateContent ?? "") }
      return item
    })
}

/** Changes when any update's text or link changes, whatever the order the API lists them in. */
export const fingerprintOf = (items: AnnouncementItem[]): string => {
  const parts = items.map((i) => [i.id, i.he.header, i.he.content, i.link ?? ""].join("\t")).sort()
  return createHash("sha256").update(parts.join("\n")).digest("hex")
}

// --- one poll ------------------------------------------------------------------------

export type PollDeps = {
  fetch: () => Promise<AnnouncementItem[]>
  extract: Extractor
  previous: () => Promise<AnnouncementsState | null>
  write: (state: AnnouncementsState) => Promise<void>
  nowNaiveMs: () => number
  nowReal: () => Date
}

const defaultDeps: PollDeps = {
  fetch: fetchAnnouncements,
  extract: extractDisruptions,
  previous: readAnnouncementsState,
  write: writeAnnouncementsState,
  nowNaiveMs: naiveNowMs,
  nowReal: () => new Date(),
}

/**
 * Fetch the feed; when its fingerprint differs from the stored state's, have the model read it
 * and store the result; otherwise just refresh the state's timestamp (and TTL).
 */
export const pollAnnouncements = async (overrides: Partial<PollDeps> = {}): Promise<AnnouncementsState> => {
  const deps = { ...defaultDeps, ...overrides }
  const items = await deps.fetch()
  const fingerprint = fingerprintOf(items)
  const fetchedAt = deps.nowReal().toISOString()

  const previous = await deps.previous()
  if (previous && previous.fingerprint === fingerprint && previous.model === openaiModel) {
    const state = { ...previous, fetchedAt }
    await deps.write(state)
    return state
  }

  const nowNaiveMs = deps.nowNaiveMs()
  const extraction = await deps.extract(items, nowNaiveMs)
  const disruptions = normalizeExtraction(extraction, nowNaiveMs)
  const state: AnnouncementsState = {
    fingerprint,
    fetchedAt,
    extractedAt: fetchedAt,
    model: openaiModel,
    disruptions,
    items: items.map((i) => ({ id: i.id, header: i.he.header })),
  }
  await deps.write(state)
  logger?.info(logNames.announcements.extracted, {
    items: items.length,
    extracted: extraction.disruptions.length,
    kept: disruptions.length,
    notes: extraction.disruptions.map((d) => `${d.confidence}: ${d.note}`),
  })
  return state
}

// --- the loop ------------------------------------------------------------------------

let started = false
let consecutiveFailures = 0

const cycle = async () => {
  try {
    await pollAnnouncements()
    if (consecutiveFailures > 0) logger?.info(logNames.announcements.recovered, { afterFailures: consecutiveFailures })
    consecutiveFailures = 0
  } catch (error) {
    consecutiveFailures += 1
    // Only the transition is logged; a long outage would otherwise fill the log.
    if (consecutiveFailures === 1) logger?.error(logNames.announcements.extractFailed, { error })
  }
  const delay =
    consecutiveFailures === 0
      ? announcementsPollSeconds * 1000
      : Math.min(MAX_BACKOFF_MS, announcementsPollSeconds * 1000 * 2 ** (consecutiveFailures - 1))
  setTimeout(cycle, delay)
}

/** Start polling Israel Railways' updates, when there is a model and a rail API to read them with. */
export const startAnnouncementsPoller = () => {
  if (started) return
  started = true
  if (!openaiApiKey || !isRailApiConfigured()) {
    logger?.warn(logNames.announcements.disabled)
    return
  }
  logger?.info(logNames.announcements.started, { model: openaiModel, everySeconds: announcementsPollSeconds })
  void cycle()
}
