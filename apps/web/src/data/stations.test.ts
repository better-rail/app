import { describe, expect, test } from "bun:test"
import { getStationById, stations, stationImage, stationName, sortedStations } from "./stations"

describe("stations", () => {
  test("ids are unique and url safe", () => {
    const ids = stations.map((station) => station.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^\d+$/)
  })

  test("looks stations up by id", () => {
    expect(getStationById("3700")).toBeDefined()
    expect(stationName(getStationById("3700")!, "en")).toBe("Tel Aviv - Savidor Center")
    expect(stationName(getStationById("680")!, "he")).toBe("ירושלים - יצחק נבון")
    expect(getStationById(3500)?.english).toBe("Herzliya")
    expect(getStationById("nowhere")).toBeUndefined()
    expect(getStationById(undefined)).toBeUndefined()
  })

  test("every station except Rishon HaRishonim has a web image", () => {
    for (const station of stations) {
      if (station.id === "9100") expect(stationImage(station, 640)).toBeUndefined()
      else expect(stationImage(station, 640)).toMatch(/^\/stations\/.+-640\.webp$/)
    }
  })

  test("sorts by the locale's collation", () => {
    expect(sortedStations("he").length).toBe(stations.length)
    expect(sortedStations("en").map((station) => station.english)).toEqual(
      [...stations].map((station) => station.english).sort(new Intl.Collator("en").compare),
    )
  })
})
