import pricesFixture from "./fixtures/GetAllPriceWithNotes.json"
import profilesFixture from "./fixtures/GetProfiles.json"
import { RailPricesResponse, RailProfilesResponse, diffFareSnapshots, normalizeRailFares } from "../../fares/pull"
import { findFare } from "../../fares/store"
import { pairKey } from "../../fares/types"
import { FareQuery } from "../../routes/fares"

// Real rail API payloads from 2026-09-07 (the price table trimmed to a few pairs).
const profiles = RailProfilesResponse.parse(profilesFixture)
const prices = RailPricesResponse.parse(pricesFixture)
const PULLED_AT = "2026-09-08T00:00:00.000Z"
const snapshot = normalizeRailFares(profiles, prices, PULLED_AT)

describe("rail API payload validation", () => {
  it("accepts the real payloads and keeps the envelope's version", () => {
    expect(prices.version).toBe("4.2.0")
    expect(prices.result.allSourceToDestination).toHaveLength(9)
    expect(profiles.result).toHaveLength(17)
  })

  it("rejects a payload whose shape changed", () => {
    expect(
      RailPricesResponse.safeParse({ result: { allSourceToDestination: [{ from_Station_Code_ISR: "3700" }] } }).success,
    ).toBe(false)
    expect(RailProfilesResponse.safeParse({ result: null }).success).toBe(false)
  })
})

describe("normalizeRailFares", () => {
  it("keys every ordered pair by station ids with its distance code and prices", () => {
    expect(snapshot.pulledAt).toBe(PULLED_AT)
    expect(snapshot.railVersion).toBe("4.2.0")
    expect(Object.keys(snapshot.pairs)).toHaveLength(9)
    expect(snapshot.pairs[pairKey(3700, 3500)]).toEqual({ distanceCode: 1, prices: { single: 11.5, daily: 23, monthly: 323 } })
    expect(snapshot.pairs[pairKey(3700, 5010)]).toEqual({ distanceCode: 1, prices: { single: 11.5, daily: 23, monthly: 323 } })
    expect(snapshot.pairs[pairKey(3700, 2200)]).toEqual({ distanceCode: 4, prices: { single: 30.5, daily: 47, monthly: 684 } })
    expect(snapshot.pairs[pairKey(3400, 1300)].distanceCode).toBe(2)
    expect(snapshot.pairs[pairKey(3500, 3700)]).toEqual(snapshot.pairs[pairKey(3700, 3500)])
  })

  it("lists the rail API's profiles in id order with their discount rates", () => {
    expect(snapshot.profiles.map((p) => p.id)).toEqual([0, 3, 4, 5, 6, 19, 33, 34, 36, 37, 40, 41, 43, 45, 47, 48, 49])
    const senior = snapshot.profiles.find((p) => p.id === 4)!
    expect(senior.name).toEqual({ he: "אזרח ותיק", en: null, ar: null, ru: null })
    expect(senior.discounts).toEqual({ single: 0.5, daily: 0.5, monthly: 0.5 })
    expect(snapshot.profiles.find((p) => p.id === 6)!.discounts).toEqual({ single: 1, daily: 1, monthly: 1 })
    expect(snapshot.profiles.find((p) => p.id === 47)!.discounts).toEqual({ single: 0, daily: 0, monthly: 0.33 })
    expect(snapshot.profiles.find((p) => p.id === 0)!.discounts).toEqual({ single: 0, daily: 0, monthly: 0 })
  })

  it("attaches the footnotes in four languages, null when the rail API has none", () => {
    const student = snapshot.profiles.find((p) => p.id === 3)!
    expect(student.note?.he).toBe("*הנחה לזכאים תינתן במעמד הטעינה בערך צבור ובהתאם לזכאות.")
    expect(student.note?.en).toStartWith("*A discount for eligible persons is given when topping-up")
    expect(student.note?.ar).not.toBeNull()
    expect(student.note?.ru).not.toBeNull()
    expect(snapshot.profiles.find((p) => p.id === 4)!.note?.en).toStartWith("*When buying a ticket using accumulated value")
    expect(snapshot.profiles.find((p) => p.id === 6)!.note).toBeNull()
    expect(snapshot.profiles.find((p) => p.id === 0)!.note).toBeNull()
  })

  it("refuses to build an empty snapshot", () => {
    const noPairs = { ...prices, result: { ...prices.result, allSourceToDestination: [] } }
    expect(() => normalizeRailFares(profiles, noPairs, PULLED_AT)).toThrow("no station pairs")
    expect(() => normalizeRailFares({ ...profiles, result: [] }, prices, PULLED_AT)).toThrow("no profiles")
  })
})

describe("diffFareSnapshots", () => {
  it("reports nothing against no previous snapshot", () => {
    const diff = diffFareSnapshots(null, snapshot)
    expect(Object.values(diff).every((list) => list.length === 0)).toBe(true)
  })

  it("reports pairs and profiles that were added, removed or changed", () => {
    const next = structuredClone(snapshot)
    next.pairs[pairKey(3700, 5010)].distanceCode = 2
    next.pairs[pairKey(3700, 5010)].prices.single = 21
    delete next.pairs[pairKey(3700, 7500)]
    next.pairs[pairKey(3700, 3900)] = { distanceCode: 2, prices: { single: 21, daily: 32.5, monthly: 323 } }
    next.profiles.find((p) => p.id === 47)!.discounts.monthly = 0.5
    next.profiles = next.profiles.filter((p) => p.id !== 43)
    next.profiles.push({
      id: 99,
      name: { he: "חדש", en: null, ar: null, ru: null },
      discounts: { single: 0, daily: 0, monthly: 0 },
      note: null,
    })

    expect(diffFareSnapshots(snapshot, next)).toEqual({
      pairsAdded: [pairKey(3700, 3900)],
      pairsRemoved: [pairKey(3700, 7500)],
      pairsChanged: [pairKey(3700, 5010)],
      profilesAdded: [99],
      profilesRemoved: [43],
      profilesChanged: [47],
    })
  })
})

describe("findFare", () => {
  it("looks a pair up in the direction asked and misses unknown ones", () => {
    expect(findFare(snapshot, 3700, 2200)?.distanceCode).toBe(4)
    expect(findFare(snapshot, 2200, 3700)?.distanceCode).toBe(4)
    expect(findFare(snapshot, 7500, 3700)).toBeNull() // only 3700 -> 7500 is in the fixture
    expect(findFare(snapshot, 3700, 3700)).toBeNull()
  })
})

describe("FareQuery", () => {
  it("coerces numeric station ids and rejects anything else", () => {
    expect(FareQuery.parse({ from: "3700", to: "5010" })).toEqual({ from: 3700, to: 5010 })
    expect(FareQuery.safeParse({ from: "3700" }).success).toBe(false)
    expect(FareQuery.safeParse({ from: "savidor", to: "5010" }).success).toBe(false)
    expect(FareQuery.safeParse({ from: "-1", to: "5010" }).success).toBe(false)
  })
})
