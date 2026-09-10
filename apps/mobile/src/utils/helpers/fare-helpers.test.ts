import { describe, expect, test } from "bun:test"
import type { FareProfile } from "@/services/api/fares-api.types"
import {
  DEFAULT_PROFILE_ID,
  applyDiscount,
  discountedPrices,
  formatPrice,
  hasMonthlyOnlyDiscount,
  isFree,
  normalizeProfileCode,
  profileName,
  profileNote,
  ridesFree,
} from "./fare-helpers"

const profile = (overrides: Partial<FareProfile>): FareProfile => ({
  id: 4,
  name: { he: "אזרח ותיק", en: null, ar: null, ru: null },
  discounts: { single: 0.5, daily: 0.5, monthly: 0.5 },
  note: null,
  ...overrides,
})

const prices = { single: 11.5, daily: 23, monthly: 323 }

describe("normalizeProfileCode", () => {
  test("maps the legacy 'general' value and a missing one onto the rail API's id", () => {
    expect(normalizeProfileCode(1)).toBe(DEFAULT_PROFILE_ID)
    expect(normalizeProfileCode(undefined)).toBe(DEFAULT_PROFILE_ID)
    expect(normalizeProfileCode(null)).toBe(DEFAULT_PROFILE_ID)
    expect(normalizeProfileCode(0)).toBe(0)
    expect(normalizeProfileCode(19)).toBe(19)
  })
})

describe("profileName", () => {
  test("uses the app label for a known profile, the rail API's name otherwise", () => {
    expect(profileName(profile({ id: 4 }), "en")).toBe("profileCodes.seniorCitizen.test")
    const unknown = profile({ id: 99, name: { he: "פרופיל חדש", en: "New profile", ar: null, ru: null } })
    expect(profileName(unknown, "en")).toBe("New profile")
    expect(profileName(unknown, "ru")).toBe("פרופיל חדש")
  })
})

describe("profileNote", () => {
  test("picks the app language, falls back to Hebrew and drops the rail API's asterisk", () => {
    const withNote = profile({ note: { he: "*הנחה בטעינה", en: "*A discount at top-up.", ar: null, ru: null } })
    expect(profileNote(withNote, "en")).toBe("A discount at top-up.")
    expect(profileNote(withNote, "ar")).toBe("הנחה בטעינה")
    expect(profileNote(profile({}), "en")).toBeNull()
    expect(profileNote(profile({ note: { he: " * ", en: "", ar: null, ru: null } }), "en")).toBeNull()
  })
})

describe("discounts", () => {
  test("apply a profile's rate per product, to the agora", () => {
    expect(applyDiscount(11.5, 0.5)).toBe(5.75)
    expect(applyDiscount(323, 0.33)).toBe(216.41)
    expect(applyDiscount(30.5, 1)).toBe(0)
    expect(discountedPrices(prices, profile({}))).toEqual({ single: 5.75, daily: 11.5, monthly: 161.5 })
    expect(discountedPrices(prices, null)).toBe(prices)
  })

  test("recognise a free-travel certificate and a monthly-only discount", () => {
    expect(isFree(1)).toBe(true)
    expect(isFree(0.5)).toBe(false)
    expect(hasMonthlyOnlyDiscount(profile({ discounts: { single: 0, daily: 0, monthly: 0.5 } }))).toBe(true)
    expect(hasMonthlyOnlyDiscount(profile({ discounts: { single: 0.5, daily: 0.5, monthly: 0.5 } }))).toBe(false)
    expect(hasMonthlyOnlyDiscount(profile({ discounts: { single: 0, daily: 0, monthly: 0 } }))).toBe(false)
  })

  test("recognise a profile that rides free on every ticket", () => {
    expect(ridesFree(profile({ discounts: { single: 1, daily: 1, monthly: 1 } }))).toBe(true)
    expect(ridesFree(profile({ discounts: { single: 1, daily: 1, monthly: 0.5 } }))).toBe(false)
    expect(ridesFree(profile({ discounts: { single: 0, daily: 0, monthly: 0 } }))).toBe(false)
  })
})

describe("formatPrice", () => {
  test("shows whole shekels bare and agorot without trailing zeros", () => {
    expect(formatPrice(23)).toBe("23 ₪")
    expect(formatPrice(11.5)).toBe("11.5 ₪")
    expect(formatPrice(5.75)).toBe("5.75 ₪")
    expect(formatPrice(0)).toBe("0 ₪")
  })
})
