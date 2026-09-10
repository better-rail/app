import { translate } from "@/i18n"
import type { LanguageCode, TxKeyPath } from "@/i18n"
import type { FarePrices, FareProfile } from "@/services/api/fares-api.types"

/** Israel Railways' "general" profile. The app used to store 1 for it — see normalizeProfileCode. */
export const DEFAULT_PROFILE_ID = 0

/** Maps the legacy stored value for "general" (1, which the rail API doesn't list) onto the real id. */
export const normalizeProfileCode = (code: number | null | undefined): number =>
  code == null || code === 1 ? DEFAULT_PROFILE_ID : code

/**
 * App labels per Israel Railways profile id, so the picker reads in the app's
 * language — the rail API only publishes Hebrew names. A profile the rail API
 * adds later falls back to the name it sends.
 */
export const PROFILE_LABELS: Record<number, TxKeyPath> = {
  0: "profileCodes.general",
  3: "profileCodes.studentExtended",
  4: "profileCodes.seniorCitizen",
  5: "profileCodes.disabled",
  6: "profileCodes.visuallyImpaired",
  19: "profileCodes.studentRegular",
  33: "profileCodes.youth",
  34: "profileCodes.nationalService",
  36: "profileCodes.police",
  37: "profileCodes.prisonService",
  40: "profileCodes.socialSecurity",
  41: "profileCodes.terrorVictims",
  43: "profileCodes.visuallyImpairedEscort",
  45: "profileCodes.zahavKav",
  47: "profileCodes.young",
  48: "profileCodes.peripheryResident",
  49: "profileCodes.dischargedSoldier",
}

export const profileName = (profile: FareProfile, locale: LanguageCode): string => {
  const label = PROFILE_LABELS[profile.id]
  return (label && translate(label)) || profile.name[locale] || profile.name.he
}

/** The rail API's footnote for the profile, in the app's language, without its leading asterisk. */
export const profileNote = (profile: FareProfile, locale: LanguageCode): string | null => {
  const note = profile.note
  if (!note) return null
  const text = (note[locale] ?? note.he ?? "").replace(/^[\s*]+/, "").trim()
  return text || null
}

export const isFree = (rate: number): boolean => rate >= 1

/** Price after a discount rate, to the agora. */
export const applyDiscount = (price: number, rate: number): number => Math.round(price * (1 - rate) * 100) / 100

export const discountedPrices = (prices: FarePrices, profile: FareProfile | null): FarePrices =>
  profile
    ? {
        single: applyDiscount(prices.single, profile.discounts.single),
        daily: applyDiscount(prices.daily, profile.discounts.daily),
        monthly: applyDiscount(prices.monthly, profile.discounts.monthly),
      }
    : prices

/**
 * Police, discharged soldiers and the like ride free on every ticket, so there
 * is no fare for them to look up — the picker leaves them out.
 */
export const ridesFree = (profile: FareProfile): boolean =>
  isFree(profile.discounts.single) && isFree(profile.discounts.daily) && isFree(profile.discounts.monthly)

/**
 * Several profiles (youth, disabled, periphery residents, …) are discounted on
 * the monthly pass only: a single ride is full price, which surprises riders
 * who just picked their profile — so the screen says so.
 */
export const hasMonthlyOnlyDiscount = (profile: FareProfile): boolean =>
  profile.discounts.single === 0 && profile.discounts.daily === 0 && profile.discounts.monthly > 0

/** "11.5 ₪", "5.75 ₪", "23 ₪". */
export const formatPrice = (price: number): string => {
  const amount = Number.isInteger(price) ? String(price) : price.toFixed(2).replace(/0$/, "")
  return `${amount} ₪`
}
