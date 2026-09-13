/**
 * The server's `/fares` API — a snapshot of Israel Railways' own tariff, kept
 * in redis by `bun run rail:pull` on the server and served per station pair.
 */

/** A string in the four app languages; the rail API publishes Hebrew, the rest are null. */
export interface FareLocalized {
  he: string
  en: string | null
  ar: string | null
  ru: string | null
}

/** Prices in ₪, or — on a profile — the fraction taken off each product (0–1). */
export interface FarePrices {
  single: number
  daily: number
  monthly: number
}

export interface FareProfile {
  id: number
  name: FareLocalized
  /** 1 is a free-travel certificate. */
  discounts: FarePrices
  /** The rail API's footnote for the profile (e.g. the discount is applied at RavKav top-up). */
  note: FareLocalized | null
}

export interface FareProfilesResult {
  updatedAt: string
  profiles: FareProfile[]
}

export interface RouteFare {
  from: number
  to: number
  /** Israel Railways' distance ring, 1–5. */
  distanceCode: number
  /** Full (undiscounted) prices. */
  prices: FarePrices
  updatedAt: string
}
