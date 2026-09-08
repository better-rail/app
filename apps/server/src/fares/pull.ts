/**
 * pull.ts — fetch Israel Railways' fares and normalize them into a FareSnapshot.
 *
 * The rail API publishes two payloads under /taarif/api/v1/PriceEng:
 * - GetProfiles: the rider profiles, Hebrew names only in practice.
 * - GetAllPriceWithNotes: a single / daily / monthly price and a distance
 *   code for every ordered station pair, a discount rate per (ticket type,
 *   profile) — ticket types 1/2/3 being single/daily/monthly — and per-profile
 *   footnotes in four languages.
 *
 * The payloads are validated before anything is written, so a changed API
 * fails the pull loudly instead of publishing a half-empty snapshot.
 */
import { z } from "zod"

import { railApiFetch } from "../requests/rail-api"
import { FarePair, FarePrices, FareProfile, FareSnapshot, Localized, pairKey } from "./types"

const envelope = <T extends z.ZodTypeAny>(result: T) =>
  z
    .object({
      version: z.string().nullable().optional(),
      successStatus: z.number().optional(),
      statusCode: z.number().optional(),
      errorMessages: z.unknown().optional(),
      result,
    })
    .passthrough()

const RailProfile = z
  .object({
    profile_Id: z.number().int(),
    heb_Profile_Desc: z.string(),
    eng_Desc: z.string().nullable().optional(),
    arb_Desc: z.string().nullable().optional(),
    rus_Desc: z.string().nullable().optional(),
  })
  .passthrough()

const RailPair = z
  .object({
    from_Station_Code_ISR: z.number().int(),
    to_Station_Code_ISR: z.number().int(),
    distance_Code: z.number().int(),
    s_Price: z.number(),
    d_Price: z.number(),
    m_Price: z.number(),
  })
  .passthrough()

const RailDiscount = z
  .object({
    ticketType: z.number().int(),
    profile_ID: z.number().int(),
    discount_Rate: z.number(),
  })
  .passthrough()

const RailNote = z
  .object({
    profile_Id: z.number().int(),
    priceNoteHe: z.string().nullable().optional(),
    priceNoteEn: z.string().nullable().optional(),
    priceNoteAr: z.string().nullable().optional(),
    priceNoteRu: z.string().nullable().optional(),
  })
  .passthrough()

export const RailProfilesResponse = envelope(z.array(RailProfile))
export const RailPricesResponse = envelope(
  z.object({
    allSourceToDestination: z.array(RailPair),
    allProfileDiscount: z.array(RailDiscount),
    priceNotes: z.array(RailNote),
  }),
)

export type RailProfilesResponse = z.infer<typeof RailProfilesResponse>
export type RailPricesResponse = z.infer<typeof RailPricesResponse>

export const PROFILES_PATH = "/taarif/api/v1/PriceEng/GetProfiles"
export const PRICES_PATH = "/taarif/api/v1/PriceEng/GetAllPriceWithNotes"

const parseResponse = async <T extends z.ZodTypeAny>(path: string, response: Response, schema: T): Promise<z.infer<T>> => {
  if (!response.ok) throw new Error(`Israel Railways API responded with ${response.status} for ${path}`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new Error(`Unexpected payload from ${path}: ${parsed.error.issues[0]?.message ?? "invalid"}`)
  return parsed.data
}

/** Both payloads from the rail API (needs RAIL_URL / RAIL_API_KEY). */
export const fetchRailFares = async (): Promise<{ profiles: RailProfilesResponse; prices: RailPricesResponse }> => {
  const [profilesRes, pricesRes] = await Promise.all([
    railApiFetch(PROFILES_PATH, { retries: 2 }),
    railApiFetch(PRICES_PATH, { retries: 2 }),
  ])
  return {
    profiles: await parseResponse(PROFILES_PATH, profilesRes, RailProfilesResponse),
    prices: await parseResponse(PRICES_PATH, pricesRes, RailPricesResponse),
  }
}

// The rail API's ticketType numbering.
const TICKET_TYPES: Record<number, keyof FarePrices> = { 1: "single", 2: "daily", 3: "monthly" }

const text = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? ""
  return trimmed === "" ? null : trimmed
}

/** Turn the two rail API payloads into the snapshot the server serves. */
export const normalizeRailFares = (
  profiles: RailProfilesResponse,
  prices: RailPricesResponse,
  pulledAt: string,
): FareSnapshot => {
  const discounts = new Map<number, FarePrices>()
  for (const d of prices.result.allProfileDiscount) {
    const product = TICKET_TYPES[d.ticketType]
    if (!product) continue
    const entry = discounts.get(d.profile_ID) ?? { single: 0, daily: 0, monthly: 0 }
    entry[product] = d.discount_Rate
    discounts.set(d.profile_ID, entry)
  }

  const notes = new Map<number, Localized>()
  for (const n of prices.result.priceNotes) {
    const he = text(n.priceNoteHe)
    const en = text(n.priceNoteEn)
    const ar = text(n.priceNoteAr)
    const ru = text(n.priceNoteRu)
    if (he || en || ar || ru) notes.set(n.profile_Id, { he: he ?? en ?? "", en, ar, ru })
  }

  const normalizedProfiles: FareProfile[] = profiles.result
    .map((p) => ({
      id: p.profile_Id,
      name: { he: p.heb_Profile_Desc.trim(), en: text(p.eng_Desc), ar: text(p.arb_Desc), ru: text(p.rus_Desc) },
      discounts: discounts.get(p.profile_Id) ?? { single: 0, daily: 0, monthly: 0 },
      note: notes.get(p.profile_Id) ?? null,
    }))
    .sort((a, b) => a.id - b.id)

  const pairs: Record<string, FarePair> = {}
  for (const p of prices.result.allSourceToDestination) {
    if (p.from_Station_Code_ISR === p.to_Station_Code_ISR) continue
    pairs[pairKey(p.from_Station_Code_ISR, p.to_Station_Code_ISR)] = {
      distanceCode: p.distance_Code,
      prices: { single: p.s_Price, daily: p.d_Price, monthly: p.m_Price },
    }
  }

  if (!normalizedProfiles.length) throw new Error("The rail API returned no profiles")
  if (!Object.keys(pairs).length) throw new Error("The rail API returned no station pairs")

  return { pulledAt, railVersion: prices.version ?? profiles.version ?? null, profiles: normalizedProfiles, pairs }
}

export type FareDiff = {
  pairsAdded: string[]
  pairsRemoved: string[]
  pairsChanged: string[]
  profilesAdded: number[]
  profilesRemoved: number[]
  profilesChanged: number[]
}

const samePrices = (a: FarePrices, b: FarePrices) => a.single === b.single && a.daily === b.daily && a.monthly === b.monthly

/** What a new snapshot changes against the previous one — the pull logs it, so a reform is visible in the cron output. */
export const diffFareSnapshots = (previous: FareSnapshot | null, next: FareSnapshot): FareDiff => {
  const diff: FareDiff = {
    pairsAdded: [],
    pairsRemoved: [],
    pairsChanged: [],
    profilesAdded: [],
    profilesRemoved: [],
    profilesChanged: [],
  }
  if (!previous) return diff

  for (const [key, pair] of Object.entries(next.pairs)) {
    const old = previous.pairs[key]
    if (!old) diff.pairsAdded.push(key)
    else if (old.distanceCode !== pair.distanceCode || !samePrices(old.prices, pair.prices)) diff.pairsChanged.push(key)
  }
  for (const key of Object.keys(previous.pairs)) {
    if (!next.pairs[key]) diff.pairsRemoved.push(key)
  }

  const oldProfiles = new Map(previous.profiles.map((p) => [p.id, p]))
  for (const profile of next.profiles) {
    const old = oldProfiles.get(profile.id)
    if (!old) diff.profilesAdded.push(profile.id)
    else if (JSON.stringify(old) !== JSON.stringify(profile)) diff.profilesChanged.push(profile.id)
    oldProfiles.delete(profile.id)
  }
  diff.profilesRemoved = [...oldProfiles.keys()]

  return diff
}
