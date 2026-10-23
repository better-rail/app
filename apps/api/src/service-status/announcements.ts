/**
 * announcements.ts — the announcements poll of the service-status gatherer.
 *
 * The old app showed Israel Railways' "railupdates" feed as a list of notices;
 * the status screens want it as disruptions on the map. Every cycle the feed
 * is fetched and fingerprinted; when it changed, the LLM (extraction.ts) reads
 * the whole list again — all at once, so repeated notices about the same works
 * fold into one disruption — and the result is published (state.ts). An
 * unchanged feed costs no model call, and neither does a restart: the stored
 * fingerprint is compared first.
 *
 * One task of the gatherer Durable Object (status-do.ts), on its alarm.
 */
import { config } from "../config"
import { logNames, logger } from "../logs"
import { isRailApiConfigured, railApiFetch } from "../requests/rail-api"
import { naiveNowMs } from "../siri/correlate"
import { type AnnouncementItem, type Extractor, extractDisruptions, normalizeExtraction } from "./extraction"
import type { AnnouncementsState } from "./state"

/** Whether there is a model and a rail API to read the updates with. */
export const isAnnouncementsConfigured = () => Boolean(config.anthropicApiKey) && isRailApiConfigured()

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
      logger.warn(logNames.announcements.fetchFailed, { language: "English", error })
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
export const fingerprintOf = async (items: AnnouncementItem[]): Promise<string> => {
  const parts = items.map((i) => [i.id, i.he.header, i.he.content, i.link ?? ""].join("\t")).sort()
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts.join("\n")))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

// --- one poll ------------------------------------------------------------------------

export type PollDeps = {
  fetch: () => Promise<AnnouncementItem[]>
  extract: Extractor
  /** The stored state (the gatherer's storage). */
  previous: () => Promise<AnnouncementsState | null>
  write: (state: AnnouncementsState) => Promise<void>
  nowNaiveMs: () => number
  nowReal: () => Date
}

const defaultDeps: Omit<PollDeps, "previous" | "write"> = {
  fetch: fetchAnnouncements,
  extract: extractDisruptions,
  nowNaiveMs: naiveNowMs,
  nowReal: () => new Date(),
}

/**
 * Fetch the feed; when its fingerprint differs from the stored state's, have the model read it
 * and store the result; otherwise just refresh the state's timestamp (and TTL).
 */
export const pollAnnouncements = async (
  overrides: Pick<PollDeps, "previous" | "write"> & Partial<PollDeps>,
): Promise<AnnouncementsState> => {
  const deps = { ...defaultDeps, ...overrides }
  const [items, previous] = await Promise.all([deps.fetch(), deps.previous()])
  const fingerprint = await fingerprintOf(items)
  const fetchedAt = deps.nowReal().toISOString()
  const model = config.anthropicModel

  if (previous && previous.fingerprint === fingerprint && previous.model === model) {
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
    model,
    disruptions,
    items: items.map((i) => ({ id: i.id, header: i.he.header })),
  }
  await deps.write(state)
  logger.info(logNames.announcements.extracted, {
    items: items.length,
    extracted: extraction.disruptions.length,
    kept: disruptions.length,
    notes: extraction.disruptions.map((d) => `${d.confidence}: ${d.note}`),
  })
  return state
}
