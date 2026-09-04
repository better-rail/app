import { describe, expect, test } from "bun:test"
import { routePairs, routeSitemapCount, routesSitemap, sitemapIndex, pagesSitemap, stationsSitemap } from "./sitemap"
import { stations } from "@/data/stations"

describe("sitemaps", () => {
  test("covers every ordered station pair in both languages", () => {
    const pairs = routePairs()
    expect(pairs.length).toBe(stations.length * (stations.length - 1))
    const total = Array.from({ length: routeSitemapCount() }, (_, i) => routesSitemap(i + 1, "2026-09-05")!).join("\n")
    expect((total.match(/<url>/g) ?? []).length).toBe(pairs.length * 2)
    expect(total).toContain("https://better-rail.co.il/routes/tel-aviv-savidor-center/herzliya")
    expect(total).toContain("https://better-rail.co.il/en/routes/tel-aviv-savidor-center/herzliya")
    expect(total).toContain('hreflang="x-default"')
    expect(routesSitemap(routeSitemapCount() + 1, "2026-09-05")).toBeNull()
  })

  test("index lists every file", () => {
    const index = sitemapIndex("2026-09-05")
    expect((index.match(/<sitemap>/g) ?? []).length).toBe(2 + routeSitemapCount())
    expect(pagesSitemap("2026-09-05")).toContain("<loc>https://better-rail.co.il/en</loc>")
    expect(stationsSitemap("2026-09-05")).toContain("/stations/herzliya</loc>")
  })
})
