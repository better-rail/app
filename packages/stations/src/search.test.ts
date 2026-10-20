import { describe, expect, test } from "bun:test"
import { stations } from "./index"
import { createStationSearch, hebrewToQwerty } from "./search"

const search = createStationSearch()
const topResult = (query: string) => search.search(query)[0]?.item.id

describe("hebrewToQwerty", () => {
  test("maps Hebrew letters to the keys they sit on", () => {
    expect(hebrewToQwerty("השלום")).toBe("vakuo")
    expect(hebrewToQwerty("תל אביב")).toBe(",k tchc")
  })
})

describe("createStationSearch", () => {
  test("finds stations typed with the keyboard left on English", () => {
    const haifa = search.search("jhpv").slice(0, 3)
    expect(haifa.every(({ item }) => item.hebrew.startsWith("חיפה"))).toBe(true)

    for (const station of stations) {
      expect(topResult(hebrewToQwerty(station.hebrew))).toBe(station.id)
    }
  })

  test("finds Hebrew aliases typed on an English keyboard", () => {
    expect(topResult(hebrewToQwerty("ארלוזרוב"))).toBe("3700")
  })

  test("still ranks English names first", () => {
    for (const station of stations) {
      expect(topResult(station.english)).toBe(station.id)
    }
  })
})
