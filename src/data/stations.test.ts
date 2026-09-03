import { describe, expect, test } from "bun:test"
import Fuse from "fuse.js"
import { setStationLocale, useStations } from "./stations"

const appendedStationNames = [
  { id: "1280", canonicalName: "בית שאן", keywords: ["דוד לוי", "David Levy", "Давид Леви", "دڤيد لِڤي"] },
  {
    id: "3600",
    canonicalName: "תל אביב - אוניברסיטה",
    keywords: ["אקספו", "Expo", "Экспо", "إكسپو"],
  },
  {
    id: "4680",
    canonicalName: "בת ים - יוספטל",
    keywords: ["אלי כהן", "Eli Cohen", "Эли Коэн", "إلي كوهين"],
  },
  {
    id: "5800",
    canonicalName: "אשדוד עד הלום",
    keywords: ["מטרופול", "Metropol", "Метропол", "متروپول"],
  },
]

describe("station aliases", () => {
  test("keeps appended co-names out of the displayed station names", () => {
    setStationLocale("he")

    const stationsById = new Map(useStations().map((station) => [station.id, station]))

    for (const { id, canonicalName, keywords } of appendedStationNames) {
      const station = stationsById.get(id)

      expect(station?.name).toBe(canonicalName)
      expect(station?.alias).toEqual(keywords)
    }
  })

  test("finds each station by every localized co-name", () => {
    setStationLocale("he")

    const stations = useStations()
    const stationSearch = new Fuse(stations, { keys: ["name", "hebrew", "alias"], threshold: 0.3 })

    for (const { id, keywords } of appendedStationNames) {
      for (const keyword of keywords) {
        expect(stationSearch.search(keyword)[0]?.item.id).toBe(id)
      }
    }
  })
})
