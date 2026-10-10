import { describe, expect, test } from "bun:test"
import { RAIL_LINES } from "@/data/rail-lines"
import { CELL, NODES, ROUTES } from "@/data/rail-map-layout"
import { THROUGH_STATIONS } from "../../../../server/src/status/through-stations"
import {
  LANE_GAP,
  buildRailMapModel,
  currentDayType,
  linePathBetween,
  lineStationPoints,
  mapStationName,
  nearestLine,
  nearestStation,
  nodePoint,
  polylineD,
  roundedPathD,
  routeNodes,
  placeLabels,
  stationPoint,
  throughStations,
} from "./rail-map-model"

describe("rail map layout", () => {
  test("every hop of every route is horizontal, vertical or diagonal", () => {
    for (const line of RAIL_LINES) {
      const points = ROUTES[line.id].map((step) => (typeof step === "string" ? [NODES[step].x, NODES[step].y] : step))
      for (let i = 1; i < points.length; i++) {
        const dx = Math.abs(points[i][0] - points[i - 1][0])
        const dy = Math.abs(points[i][1] - points[i - 1][1])
        const octilinear = dx < 1e-9 || dy < 1e-9 || Math.abs(dx - dy) < 1e-9
        expect(octilinear, `line ${line.id}: ${JSON.stringify(points[i - 1])} → ${JSON.stringify(points[i])}`).toBe(true)
      }
    }
  })

  test("every route runs through its corridor's stations in order, and only through known nodes", () => {
    for (const line of RAIL_LINES) {
      const nodes = routeNodes(ROUTES[line.id])
      for (const id of nodes) expect(NODES[id], `line ${line.id} routes through ${id}`).toBeDefined()
      const onRoute = nodes.filter((id) => line.stationIds.includes(id))
      expect(onRoute).toEqual(line.stationIds)
    }
  })

  test("lines sharing a hop agree on its bends", () => {
    const bends = new Map<string, string>()
    for (const line of RAIL_LINES) {
      const route = ROUTES[line.id]
      let from: string | undefined
      let between: number[][] = []
      for (const step of route) {
        if (typeof step !== "string") {
          between.push(step)
          continue
        }
        if (from) {
          const key = from < step ? `${from}|${step}` : `${step}|${from}`
          const forward = from < step
          const shape = JSON.stringify(forward ? between : [...between].reverse())
          const known = bends.get(key)
          if (known) expect(shape, `hop ${key} on line ${line.id}`).toBe(known)
          else bends.set(key, shape)
        }
        from = step
        between = []
      }
    }
  })

  test("the stations a line runs through without calling are what the server's catalogue says", () => {
    for (const line of RAIL_LINES) {
      expect(throughStations(line.id).sort()).toEqual(THROUGH_STATIONS[line.id].map((t) => t.stationId).sort())
    }
  })
})

describe("rail map model", () => {
  const model = buildRailMapModel("weekday")

  test("draws every catalogue line with a point on its lane for every station it passes", () => {
    expect(model.lines.map((l) => l.lineId)).toEqual(RAIL_LINES.map((l) => l.id))
    for (const line of model.lines) {
      for (const id of routeNodes(ROUTES[line.lineId]).filter((n) => NODES[n].label)) {
        expect(line.stationIndex.has(id), `${line.lineId} at ${id}`).toBe(true)
      }
      const indexes = line.line.stationIds.map((id) => line.stationIndex.get(id) as number)
      expect([...indexes]).toEqual([...indexes].sort((a, b) => a - b))
      expect(line.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))).toBe(true)
      expect(line.vertices.every((v) => v.x >= 0 && v.x <= model.bounds.width && v.y >= 0 && v.y <= model.bounds.height)).toBe(
        true,
      )
      expect(line.d.startsWith("M")).toBe(true)
    }
  })

  test("lines sharing a stretch run as parallel lanes a lane apart, and a lone line on the centre line", () => {
    const at = (lineId: string, stationId: string) => {
      const line = model.lines.find((l) => l.lineId === lineId)
      return line?.vertices[line.stationIndex.get(stationId) as number]
    }
    // Eight lines through Tel Aviv: their lanes sit a lane apart, centred on the grid column.
    const savidor = model.lines.filter((l) => l.stationIndex.has("3700")).map((l) => at(l.lineId, "3700")?.x as number)
    expect(savidor.length).toBe(8)
    // Seven lanes: 5 and 25 share one.
    const sorted = [...new Set(savidor.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b)
    expect(sorted.length).toBe(7)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i] - sorted[i - 1]).toBeCloseTo(LANE_GAP, 5)
    expect((sorted[0] + sorted[6]) / 2).toBeCloseTo(nodePoint("3700").x, 5)
    expect(at("5", "3700")?.x).toBeCloseTo(at("25", "3700")?.x as number, 5)
    // Nothing moves where a line is born beside the bundle: Binyamina, Netanya and Herzliya leave every lane in place.
    for (const id of ["1", "3", "3X"]) expect(at(id, "2500")?.x).toBeCloseTo(at(id, "3500")?.x as number, 5)
    expect(at("2", "2800")?.x).toBeCloseTo(at("2", "3500")?.x as number, 5)
    expect(at("7", "3500")?.x).toBeGreaterThan(at("1", "3500")?.x as number)
    // The Karmiel pair crosses onto the west of the trunk at its junction, as on the railways' map.
    expect(at("4", "1400")?.x).toBeLessThan(at("3X", "1400")?.x as number)
    expect(at("3X", "1400")?.x).toBeLessThan(at("3", "1400")?.x as number)
    // Lines 1 and 7 swap under the airport's capsule: line 1 turns north for Modi'in at the junction beyond.
    expect(at("1", "4900")?.x).toBeLessThan(at("7", "4900")?.x as number)
    const one = model.lines.find((l) => l.lineId === "1") as (typeof model.lines)[number]
    const seven = model.lines.find((l) => l.lineId === "7") as (typeof model.lines)[number]
    const after = (line: typeof one) => line.vertices[(line.stationIndex.get("8600") as number) + 1]
    expect(after(one).y).toBeLessThan(after(seven).y)
    // Line 6 keeps its lane past Ashkelon, where line 2 ends beside it, rather than shifting onto the column.
    expect(at("6", "9600")?.x).toBeCloseTo(at("6", "5900")?.x as number, 5)
    expect(at("6", "9600")?.x).toBeCloseTo(nodePoint("9600").x - LANE_GAP / 2, 5)
    // Line 6 west of the trunk at HaHagana, where it leaves for Holon; lines 1 and 7 on the east for the airport.
    expect(at("6", "4900")?.x).toBeLessThan(at("2", "4900")?.x as number)
    expect(at("1", "4900")?.x).toBeGreaterThan(at("3", "4900")?.x as number)
    expect(at("7", "4900")?.x).toBeGreaterThan(at("3", "4900")?.x as number)
  })

  test("marks every station some served line calls at, on the lanes that call", () => {
    const mark = (id: string) => model.marks.find((m) => m.stationId === id)
    // Netanya Sapir: only line 2 calls, five lines run through.
    const sapir = mark("3310")
    expect(sapir?.lanes.map((l) => `${l.lineId}${l.calls ? "" : "-"}`)).toEqual(["25-", "5-", "2", "3X-", "3-", "1-"])
    expect(sapir?.capsules.length).toBe(1)
    // Ramla: 3X runs through on the west, 3 and 5 call beside each other — one capsule.
    expect(mark("5010")?.capsules.length).toBe(1)
    expect(mark("5010")?.lanes.map((l) => `${l.lineId}${l.calls ? "" : "-"}`)).toEqual(["3X-", "3", "5"])
    // Lod: every line through it calls, line 9 on a lane of its own west of the bundle — one capsule across all six.
    // Lines joining at a bundle's edge leave the rest where they were: no lane moves at Binyamina or Atlit.
    for (const id of ["1", "3", "3X"]) {
      const line = model.lines.find((l) => l.lineId === id) as (typeof model.lines)[number]
      const x = (station: string) => line.vertices[line.stationIndex.get(station) as number].x
      expect(x("2800")).toBeCloseTo(x("2820"), 5)
      expect(x("2300")).toBeCloseTo(x("2500"), 5)
    }
    const lod = mark("5000")
    expect(lod?.capsules.length).toBe(1)
    expect(lod?.lanes.map((l) => l.lineId)).toEqual(["9", "25", "5", "2", "3X", "3"])
    // Sderot: line 6 alone — a tick, no capsule.
    expect(mark("9600")?.lone).toBe(true)
    expect(mark("9600")?.capsules).toEqual([])
    // Atlit: line 1 may pass (dashed), line 11 ends (dot), 3X runs through.
    const atlit = mark("2500")
    expect(atlit?.irregular.length).toBe(1)
    expect(atlit?.terminals.length).toBe(1)
    // Every station with a mark has a name, and a station only the Hadera East line serves is on the weekday map alone.
    expect(model.labels.map((l) => l.stationId).sort()).toEqual(model.marks.map((m) => m.stationId).sort())
    expect(mark("3900")).toBeDefined()
    expect(buildRailMapModel("weekend").marks.find((m) => m.stationId === "3900")).toBeUndefined()
  })

  test("the weekend and night maps drop the lines that do not run then", () => {
    const weekend = buildRailMapModel("weekend")
    expect(weekend.dayType).toBe("weekend")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("12")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("3X")
    const night = buildRailMapModel("night")
    expect(night.lines.map((l) => l.lineId)).toEqual(["1", "7"])
    // Line 7 keeps its lane west of line 1 (the side it leaves on for Jerusalem) even with the other six gone.
    const herzliya = night.marks.find((m) => m.stationId === "3500")
    expect(herzliya?.lanes.map((l) => l.lineId)).toEqual(["1", "7"])
  })

  test("the day type follows the Israeli week, with the service day rolling over at 03:00", () => {
    expect(currentDayType(new Date("2026-09-09T12:00:00"))).toBe("weekday") // Wednesday
    expect(currentDayType(new Date("2026-09-11T12:00:00"))).toBe("weekend") // Friday
    expect(currentDayType(new Date("2026-09-12T23:00:00"))).toBe("weekend") // Saturday night
    expect(currentDayType(new Date("2026-09-11T01:00:00"))).toBe("night") // Thursday night's trains
    expect(currentDayType(new Date("2026-09-11T04:29:00"))).toBe("night")
    expect(currentDayType(new Date("2026-09-11T04:30:00"))).toBe("weekend") // Friday's morning service
    expect(currentDayType(new Date("2026-09-08T04:30:00"))).toBe("weekday") // Tuesday's morning service
    expect(currentDayType(new Date("2026-09-13T01:00:00"))).toBe("weekend") // Saturday's last trains
    expect(currentDayType(new Date("2026-09-12T01:00:00"))).toBe("weekend") // Friday night: no trains
  })

  test("cuts the stretch of a line between two stations, in either order, along the line", () => {
    const line = model.lines.find((l) => l.lineId === "3") as (typeof model.lines)[number]
    const forward = linePathBetween(line, "3700", "5000")
    const backward = linePathBetween(line, "5000", "3700")
    expect(forward).toBeDefined()
    expect(forward).toBe(backward)
    expect(forward?.startsWith("M")).toBe(true)
    expect(linePathBetween(line, "3700", "9999")).toBeUndefined()
    // The stretch runs from the one station's point to the other's.
    const [a, b] = lineStationPoints(line, ["3700", "5000"])
    expect(forward?.startsWith(`M${a.x} ${a.y}`) || forward?.startsWith(`M${Math.round(a.x * 1000) / 1000}`)).toBe(true)
    expect(forward?.endsWith(`${Math.round(b.x * 1000) / 1000} ${Math.round(b.y * 1000) / 1000}`)).toBe(true)
    expect(lineStationPoints(line, ["9999"])).toEqual([])
  })

  test("finds the station and the line under a tap", () => {
    const lod = stationPoint(model, "5000") as { x: number; y: number }
    expect(nearestStation(model, lod, 1)?.stationId).toBe("5000")
    expect(nearestStation(model, { x: lod.x + 40, y: lod.y }, 1)).toBeUndefined()
    // Just off the west end of Lod's capsule is line 9's lane.
    const line9 = model.lines.find((l) => l.lineId === "9") as (typeof model.lines)[number]
    const mid = line9.vertices[0]
    const west = { x: mid.x - 2 * CELL, y: mid.y }
    expect(nearestLine(model, west, 1)?.lineId).toBe("9")
    expect(nearestLine(model, { x: -50, y: -50 }, 1)).toBeUndefined()
    // No station where no line calls: the junction south of the airport.
    expect(stationPoint(model, "j-modiin")).toBeUndefined()
  })

  test("rounds bends into arcs and leaves straight runs alone", () => {
    const straight = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 0, y: 20 },
    ]
    expect(roundedPathD(straight)).toBe("M0 0 L0 10 L0 20")
    const bent = [
      { x: 0, y: 0 },
      { x: 0, y: 10 },
      { x: 10, y: 10 },
    ]
    expect(roundedPathD(bent, undefined, 2)).toBe("M0 0 L0 8 A2 2 0 0 0 2 10 L10 10")
    // A lane offset to the outside of the bend gets a larger radius; inside, a smaller one.
    expect(roundedPathD(bent, [0, -1, 0], 2)).toContain("A3 3")
    expect(roundedPathD(bent, [0, 1, 0], 2)).toContain("A1 1")
    expect(polylineD(bent)).toBe("M0 0 L0 10 L10 10")
    expect(roundedPathD(bent, undefined, 2, true)).toEndWith("Z")
  })

  test("places every name beside its marker, clear of the other names and markers", () => {
    // A rough measure: names about eight units wide at the map's size, wrapped to the width given.
    const measure = (_stationId: string, maxWidth: number) => {
      const width = 8
      const lines = Math.max(1, Math.ceil(width / maxWidth))
      return { width: Math.min(width, maxWidth), height: lines * 2 }
    }
    const { labels, frames } = placeLabels(model, measure)
    expect(labels.map((l) => l.stationId).sort()).toEqual(model.marks.map((m) => m.stationId).sort())
    expect(frames.map((f) => f.id)).toEqual(["haifa", "telaviv", "jerusalem", "beersheva"])
    const overlap = (a: { left: number; right: number; top: number; bottom: number }, b: typeof a) =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    for (const a of labels) {
      for (const b of labels) if (a !== b) expect(overlap(a.box, b.box), `${a.stationId} over ${b.stationId}`).toBe(false)
      for (const m of model.marks)
        if (m.stationId !== a.stationId) expect(overlap(a.box, m.clear), `${a.stationId} over ${m.stationId}`).toBe(false)
    }
    // Names go on their preferred side where there is room: the trunk's on the left, Lod's on the right.
    expect(labels.find((l) => l.stationId === "3700")?.side).toBe("left")
    expect(labels.find((l) => l.stationId === "5000")?.side).toBe("right")
  })

  test("shortens names for the map", () => {
    expect(mapStationName("Tel Aviv - HaShalom", true)).toBe("HaShalom")
    expect(mapStationName("Tel Aviv - HaShalom", false)).toBe("Tel Aviv - HaShalom")
    expect(mapStationName("מרכזית המפרץ (לב המפרץ)", false)).toBe("מרכזית המפרץ (לב המפרץ)")
    expect(mapStationName("Be'er Sheva - North/University", true)).toBe("North/\u200BUniversity")
  })
})
