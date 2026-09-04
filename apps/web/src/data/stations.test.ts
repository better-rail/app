import { describe, expect, test } from "bun:test"
import {
  getStationBySlug,
  resolveStation,
  slugify,
  stations,
  popularRoutes,
  suggestedDestinations,
  stationImage,
} from "./stations"

describe("stations", () => {
  test("slugs are unique, lowercase and url safe", () => {
    const slugs = stations.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  test("slugify handles apostrophes, dashes and slashes", () => {
    expect(slugify("Tel Aviv - Savidor Center")).toBe("tel-aviv-savidor-center")
    expect(slugify("Be'er Sheva - North/University")).toBe("beer-sheva-north-university")
    expect(slugify("Kiryat Malakhi – Yoav")).toBe("kiryat-malakhi-yoav")
    expect(slugify("Yokne'am - Kfar Yehoshu'a")).toBe("yokneam-kfar-yehoshua")
  })

  test("resolves slugs and legacy numeric ids", () => {
    expect(resolveStation("3700")?.slug).toBe("tel-aviv-savidor-center")
    expect(resolveStation("Tel-Aviv-Savidor-Center")?.id).toBe("3700")
    expect(resolveStation("nowhere")).toBeUndefined()
    expect(getStationBySlug("jerusalem-yitzhak-navon")?.id).toBe("680")
  })

  test("every station except Rishon HaRishonim has a web image", () => {
    for (const station of stations) {
      if (station.id === "9100") expect(stationImage(station, 640)).toBeUndefined()
      else expect(stationImage(station, 640)).toMatch(/^\/stations\/.+-640\.webp$/)
    }
  })

  test("suggestions never include the station itself", () => {
    const tlv = resolveStation("3700")!
    expect(suggestedDestinations(tlv).some((s) => s.id === tlv.id)).toBe(false)
    expect(popularRoutes.length).toBeGreaterThan(0)
  })
})
