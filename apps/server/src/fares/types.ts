/**
 * types.ts — the fares snapshot the server serves.
 *
 * Israel Railways prices a ride by the "distance code" of the station pair
 * (1–5) and publishes, per pair, the single / daily / monthly price; rider
 * profiles (senior, student, …) get a rate off each product. `bun run
 * rail:pull` normalizes the rail API's two payloads into this shape and stores
 * it in redis; the /fares routes only ever read that snapshot.
 */

export type Localized = { he: string; en: string | null; ar: string | null; ru: string | null }

/** Prices in ₪ (or, for a profile, the fraction taken off: 0–1). */
export type FarePrices = { single: number; daily: number; monthly: number }

export type FareProfile = {
  id: number
  name: Localized
  /** Discount rate per product, 0–1; 1 is a free-travel certificate. */
  discounts: FarePrices
  /** The rail API's footnote for this profile (e.g. "discount is given at top-up"), if any. */
  note: Localized | null
}

export type FarePair = {
  distanceCode: number
  prices: FarePrices
}

export type FareSnapshot = {
  /** When the snapshot was pulled from the rail API (ISO). */
  pulledAt: string
  /** The rail API's own version stamp on the payload, for the record. */
  railVersion: string | null
  profiles: FareProfile[]
  /** Keyed by pairKey(from, to); both directions are listed. */
  pairs: Record<string, FarePair>
}

export const pairKey = (from: number, to: number) => `${from}-${to}`
