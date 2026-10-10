import { test, expect } from "bun:test"
import { isWebsiteURL, parseWebsiteRouteURL, websiteRouteURL } from "./web-links"

test("recognizes better-rail.co.il links only", () => {
  expect(isWebsiteURL("https://better-rail.co.il")).toBe(true)
  expect(isWebsiteURL("https://www.better-rail.co.il/en/routes/3700/4600")).toBe(true)
  expect(isWebsiteURL("https://better-rail.co.il.evil.com/routes/3700/4600")).toBe(false)
  expect(isWebsiteURL("betterrail://route-list")).toBe(false)
})

test("parses a routes page link with a date and time", () => {
  const route = parseWebsiteRouteURL("https://better-rail.co.il/en/routes/3700/4600?date=2026-10-06&time=09:30&trip=101-202")
  expect(route).toEqual({ originId: "3700", destinationId: "4600", time: new Date(2026, 9, 6, 9, 30).getTime(), trip: "101-202" })
})

test("a routes page link without a date searches from now", () => {
  const before = Date.now()
  const route = parseWebsiteRouteURL("https://better-rail.co.il/routes/3700/4600")
  expect(route?.time).toBeGreaterThanOrEqual(before)
})

test("other pages aren't routes", () => {
  expect(parseWebsiteRouteURL("https://better-rail.co.il/about")).toBeNull()
  expect(parseWebsiteRouteURL("https://better-rail.co.il/og/routes/3700/4600.jpg")).toBeNull()
})

test("builds the website link, round-tripping the time", () => {
  const time = new Date(2026, 9, 6, 9, 30).getTime()
  const he = websiteRouteURL({ originId: "3700", destinationId: "4600", time, locale: "he" })
  expect(he).toBe("https://better-rail.co.il/routes/3700/4600?date=2026-10-06&time=09%3A30")
  expect(parseWebsiteRouteURL(he)?.time).toBe(time)

  const en = websiteRouteURL({ originId: "3700", destinationId: "4600", time, trainNumbers: [101, 202], locale: "ru" })
  expect(en).toBe("https://better-rail.co.il/en/routes/3700/4600?date=2026-10-06&time=09%3A30&trip=101-202")
})
