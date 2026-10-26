import { describe, expect, test } from "bun:test"
import { RIDER_NAME_COMBINATIONS, riderName } from "./rider-names"

describe("riderName", () => {
  test("is stable for a seed and shares the animal across languages", () => {
    const en = riderName(42, "en")
    expect(riderName(42, "en")).toEqual(en)
    expect(riderName(42, "he").emoji).toBe(en.emoji)
    expect(riderName(42, "ru").emoji).toBe(en.emoji)
    expect(riderName(42, "ar").emoji).toBe(en.emoji)
  })

  test("agrees with the noun's gender in Hebrew", () => {
    // Seed 12 is the goat (feminine); adjective 0 is "punctual"
    expect(riderName(12, "he").name).toBe("העז הדייקנית")
    expect(riderName(0, "he").name).toBe("השקנאי הדייקן")
  })

  test("every seed yields a unique name", () => {
    const names = new Set(Array.from({ length: RIDER_NAME_COMBINATIONS }, (_, seed) => riderName(seed, "en").name))
    expect(names.size).toBe(RIDER_NAME_COMBINATIONS)
  })
})
