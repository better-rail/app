import { describe, expect, test } from "bun:test"
import { getRailLine } from "@/data/rail-lines"
import type { Disruption, LineStatus } from "@/services/api"
import { concernsRoute, linesServing, routeStretch, trafficLight, userDisruptions, userLineIds, userRoutes } from "./user-lines"

// Nahariya – Modi'in: Nahariya (1600), Akko, …, Haifa Center (2100), Bat Galim, Hof HaCarmel, Atlit, Binyamina (2800), …
// Nahariya – Be'er Sheva (line 3) runs the same coast; Binyamina – Ashkelon (line 2) starts at Binyamina.
const line1 = getRailLine("1")!

const disruption = (id: string, level: Disruption["level"], stationIds: string[] | null): Disruption => ({
  id,
  kind: stationIds ? "suspension" : "delays",
  level,
  section: stationIds ? { fromStationId: stationIds[0], toStationId: stationIds[stationIds.length - 1], stationIds } : null,
  trains: [],
})

const lineStatus = (lineId: string, disruptions: Disruption[]): LineStatus => ({
  lineId,
  level: disruptions[0]?.level ?? "goodService",
  disruptions,
  trains: { active: 10, delayed: 0, cancelled: 0, maxDelayMinutes: 0 },
  line: { badge: lineId, color: "#000000", name: { he: "", en: "" }, stationIds: [] },
})

describe("userRoutes", () => {
  test("the planned route comes first, then the favourites, each pair once whichever way round", () => {
    const routes = userRoutes({ origin: { id: "2100" }, destination: { id: "3700" } }, [
      { originId: "3700", destinationId: "2100" },
      { originId: "1600", destinationId: "2800" },
    ])
    expect(routes).toEqual([
      { originId: "2100", destinationId: "3700" },
      { originId: "1600", destinationId: "2800" },
    ])
  })

  test("a half-planned route and a route to the same station are no routes", () => {
    expect(userRoutes({ origin: { id: "2100" } }, [{ originId: "3700", destinationId: "3700" }])).toEqual([])
  })
})

describe("linesServing", () => {
  test("the lines calling at both ends", () => {
    expect(linesServing({ originId: "1600", destinationId: "2100" }).map((l) => l.id)).toEqual(["1", "3"])
    expect(linesServing({ originId: "3600", destinationId: "3700" }).map((l) => l.id)).toContain("1")
    expect(linesServing({ originId: "3600", destinationId: "3700" }).length).toBeGreaterThan(2)
  })

  test("no line serves a route between stations no line shares", () => {
    // Nahariya and Dimona: a change is needed between them.
    expect(linesServing({ originId: "1600", destinationId: "7500" })).toEqual([])
  })
})

describe("userLineIds", () => {
  test("in the order of the routes, each line once", () => {
    const ids = userLineIds([
      { originId: "1600", destinationId: "2100" },
      { originId: "3600", destinationId: "3700" },
    ])
    expect(ids[0]).toBe("1")
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("routeStretch", () => {
  test("the line's stations between the two ends, inclusive, whichever way round", () => {
    const stretch = ["2100", "2200", "2300", "2500", "2800"]
    expect(routeStretch(line1, { originId: "2100", destinationId: "2800" })).toEqual(stretch)
    expect(routeStretch(line1, { originId: "2800", destinationId: "2100" })).toEqual(stretch)
    expect(routeStretch(line1, { originId: "2100", destinationId: "7300" })).toEqual([])
  })
})

describe("concernsRoute", () => {
  const route = { originId: "2100", destinationId: "2800" }

  test("a stretch overlapping the rider's does; one elsewhere on the line does not", () => {
    expect(concernsRoute(line1, disruption("a", "partSuspended", ["2300", "2500", "2800", "2820"]), route)).toBe(true)
    expect(concernsRoute(line1, disruption("b", "partSuspended", ["3600", "3700", "4600"]), route)).toBe(false)
  })

  test("the whole line counts when it is worse than minor delays", () => {
    expect(concernsRoute(line1, disruption("c", "severeDelays", null), route)).toBe(true)
    expect(concernsRoute(line1, disruption("d", "minorDelays", null), route)).toBe(false)
  })

  test("good news is not a disruption", () => {
    expect(concernsRoute(line1, disruption("e", "goodService", ["2300", "2500"]), route)).toBe(false)
  })
})

describe("userDisruptions", () => {
  test("worst first, each once across routes on the same line", () => {
    const minor = disruption("minor", "minorDelays", ["2100", "2200"])
    const suspended = disruption("suspended", "suspended", ["2500", "2800"])
    const elsewhere = disruption("elsewhere", "severeDelays", ["300", "400"])
    // Line 2 does not reach Haifa, so what is wrong on it is not the rider's concern.
    const snapshot = {
      lines: [lineStatus("1", [minor, suspended, elsewhere]), lineStatus("2", [disruption("x", "suspended", null)])],
    }
    const found = userDisruptions(snapshot, [
      { originId: "2100", destinationId: "2800" },
      { originId: "2200", destinationId: "2500" },
    ])
    expect(found.map((d) => d.disruption.id)).toEqual(["suspended", "minor"])
    expect(found[0].status.lineId).toBe("1")
  })

  test("nothing without a snapshot", () => {
    expect(userDisruptions(undefined, [{ originId: "2100", destinationId: "2800" }])).toEqual([])
  })
})

describe("trafficLight", () => {
  test("green, orange, red, or nothing", () => {
    expect(trafficLight("goodService")).toBe("goodService")
    expect(trafficLight("minorDelays")).toBe("minorDelays")
    expect(trafficLight("severeDelays")).toBe("severeDelays")
    expect(trafficLight("partSuspended")).toBe("severeDelays")
    expect(trafficLight("suspended")).toBe("severeDelays")
    expect(trafficLight("noService")).toBeUndefined()
    expect(trafficLight("unknown")).toBeUndefined()
    expect(trafficLight(undefined)).toBeUndefined()
  })
})
