import { describe, expect, test } from "bun:test"
import { RAIL_LINES } from "@/data/rail-lines"
import { STATION_LABELS } from "@/data/rail-map-layout"
import {
  SEA_FADE,
  SEA_FADE_STOPS,
  SEA_REACH,
  buildRailMapModel,
  currentDayType,
  extendCoast,
  linePathBetween,
  lineStationPoints,
  mapStationName,
  nearestLine,
  polylineD,
  seaBands,
  smoothPathD,
} from "./rail-map-model"

describe("rail map model", () => {
  const model = buildRailMapModel("weekday")

  test("the weekend map drops the lines that do not run then, with their stations and stubs", () => {
    const weekend = buildRailMapModel("weekend")
    expect(weekend.dayType).toBe("weekend")
    expect(model.lines.map((l) => l.lineId)).toContain("12")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("12")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("3X")
    // Hadera East is only on the eastern line.
    expect(model.labels.some((l) => l.stationId === "3900")).toBe(true)
    expect(weekend.labels.some((l) => l.stationId === "3900")).toBe(false)
    // Hardly any line 2 train ends at Rehovot on the weekend: no stub, a plain stop.
    expect(weekend.extras.map((e) => e.lineId)).toEqual(["6"])
    expect(weekend.markers.find((m) => m.stationId === "5200" && m.lineId === "2")?.kind).toBe("stop")
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

  test("draws every catalogue line along its traced polyline with the calling points in corridor order", () => {
    expect(model.lines.map((l) => l.lineId)).toEqual(RAIL_LINES.map((l) => l.id))
    for (const line of model.lines) {
      expect(line.stations.map((s) => s.id)).toEqual(line.line.stationIds)
      const indexes = line.stations.map((s) => s.index)
      expect([...indexes]).toEqual([...indexes].sort((a, b) => a - b))
      expect(indexes.every((i) => i >= 0 && i < line.vertices.length)).toBe(true)
      expect(line.vertices.every((v) => Number.isFinite(v.x) && Number.isFinite(v.y))).toBe(true)
      expect(line.vertices.every((v) => v.x >= 0 && v.x <= model.bounds.width && v.y >= 0 && v.y <= model.bounds.height)).toBe(
        true,
      )
      expect(line.d.startsWith("M")).toBe(true)
    }
  })

  test("every station on a line has a name on the map, and every name belongs to a station on a line", () => {
    const onLines = new Set(RAIL_LINES.flatMap((l) => l.stationIds))
    expect([...onLines].sort()).toEqual(Object.keys(STATION_LABELS).sort())
    expect(model.labels.map((l) => l.stationId).sort()).toEqual([...onLines].sort())
  })

  test("a dot marks every lane that calls at a station, a hollow circle where trains may pass, a ringed dot at a terminal", () => {
    const savidor = model.markers.filter((m) => m.stationId === "3700")
    expect(savidor.length).toBeGreaterThanOrEqual(6)
    expect(savidor.every((m) => m.kind === "stop" || m.kind === "terminal")).toBe(true)
    const dimona = model.markers.filter((m) => m.stationId === "7500")
    expect(dimona.map((m) => [m.lineId, m.kind])).toEqual([["8", "terminal"]])
    // Where a line calls comes from the timetable: line 3's weekday trains run through Kiryat Hayim (no dot on its
    // lane), and on weekends a quarter of the Karmiel trains do.
    const kiryatHayim = (m: ReturnType<typeof buildRailMapModel>) =>
      Object.fromEntries(m.markers.filter((mk) => mk.stationId === "700").map((mk) => [mk.lineId, mk.kind]))
    expect(kiryatHayim(model)).toEqual({ "1": "stop", "4": "stop" })
    expect(kiryatHayim(buildRailMapModel("weekend"))["4"]).toBe("irregular")
    // The express lane stands for line 6's trains running through Bat Yam: the stopping lane keeps plain dots.
    expect(model.markers.find((m) => m.stationId === "4640" && m.lineId === "6")?.kind).toBe("stop")
    // Most line 2 trains run through Lod – Gane Aviv.
    expect(model.markers.find((m) => m.stationId === "5150" && m.lineId === "2")?.kind).toBe("irregular")
    // Every line ends in terminals; the timetable's short workings add terminals along the way.
    for (const line of model.lines) {
      const kinds = model.markers.filter((m) => m.lineId === line.lineId).map((m) => m.kind)
      expect(kinds[0]).toBe("terminal")
      expect(kinds[kinds.length - 1]).toBe("terminal")
    }
    const savidorKinds = Object.fromEntries(model.markers.filter((m) => m.stationId === "3700").map((m) => [m.lineId, m.kind]))
    expect(savidorKinds["5"]).toBe("terminal")
    expect(savidorKinds["3"]).toBe("terminal")
    expect(savidorKinds["2"]).toBe("stop")
    expect(model.markers.find((m) => m.stationId === "2300" && m.lineId === "11")?.kind).toBe("terminal")
  })

  test("the express lane past Bat Yam and the Rehovot stub are drawn beside their lines", () => {
    expect(model.extras.map((e) => e.lineId).sort()).toEqual(["2", "6"])
    expect(model.extras.find((e) => e.lineId === "2")?.terminal).toBeDefined()
    expect(model.extras.find((e) => e.lineId === "6")?.terminal).toBeUndefined()
    expect(model.extras.every((e) => e.d.startsWith("M"))).toBe(true)
  })

  test("labels for the big cities' stations drop the city prefix, the rest keep their names", () => {
    expect(model.labels.find((l) => l.stationId === "4600")?.stationNameOnly).toBe(true)
    expect(model.labels.find((l) => l.stationId === "3500")?.stationNameOnly).toBe(false)
    expect(model.labels.find((l) => l.stationId === "3500")?.side).toBe("left")
    expect(model.labels.find((l) => l.stationId === "1840")?.side).toBe("right")
  })

  test("a stretch of a line can be extracted between two of its stations", () => {
    const line2 = model.lines.find((l) => l.lineId === "2")
    if (!line2) throw new Error("line 2 missing")
    expect(linePathBetween(line2, "5800", "5900")).toBeDefined()
    expect(linePathBetween(line2, "5900", "5800")).toBe(linePathBetween(line2, "5800", "5900"))
    expect(linePathBetween(line2, "5800", "680")).toBeUndefined()
    expect(lineStationPoints(line2, ["5800", "680", "5900"])).toHaveLength(2)
  })

  test("tapping near a line finds it, tapping empty ground finds nothing", () => {
    const dimona = model.markers.find((m) => m.stationId === "7500")
    if (!dimona) throw new Error("Dimona missing")
    expect(nearestLine(model, { x: dimona.point.x - 1, y: dimona.point.y - 1 }, 3)?.lineId).toBe("8")
    expect(nearestLine(model, { x: 5, y: 40 }, 3)).toBeUndefined()
  })

  test("city frames and the aeroplane come from the traced layout", () => {
    expect(model.cities.map((c) => c.id)).toEqual(["haifa", "telaviv", "jerusalem", "beersheva"])
    expect(model.airport.height).toBeGreaterThan(0)
  })

  test("at night only lines 1 and 7 run, calling at a few stations and running through the rest unnamed", () => {
    const night = buildRailMapModel("night")
    expect(night.lines.map((l) => l.lineId).sort()).toEqual(["1", "7"])
    const calls = (lineId: string) => night.markers.filter((m) => m.lineId === lineId).map((m) => m.stationId)
    expect(calls("1")).toEqual(["1600", "1500", "1400", "2100", "2300", "2800", "3100", "3300", "3500", "3700", "8600", "400"])
    expect(calls("7")).toEqual(["3500", "3700", "8600", "680"])
    const named = new Set(night.labels.map((l) => l.stationId))
    expect(named.has("3700")).toBe(true) // Tel Aviv Savidor: both lines call
    expect(named.has("3600")).toBe(false) // Tel Aviv University: both run through
    expect(named.has("700")).toBe(false) // Kiryat Haim: line 1 runs through, no other line runs
    expect(night.markers.every((m) => m.kind !== "irregular")).toBe(true)
  })

  test("the sea is cut into bands along the coast whose gradients follow the horizontal distance from it", () => {
    const coast = [
      { x: 40, y: 0 },
      { x: 40, y: 10 },
      { x: 30, y: 30 },
      { x: 0, y: 60 },
    ]
    const bands = seaBands(coast)
    expect(bands).toHaveLength(3)
    const land = SEA_FADE[0][0]
    const far = SEA_FADE[SEA_FADE.length - 1][0]
    // From far beyond the map's left edge to the halo's edge on land; a band runs a little into the next.
    expect(bands[0].d).toBe(`M${-SEA_REACH} 0 L${40 - land} 0 L${40 - land} 10.15 L${-SEA_REACH} 10.15 Z`)
    expect(bands[2].d.endsWith(` 60 L${-SEA_REACH} 60 Z`)).toBe(true)
    for (const [i, band] of bands.entries()) {
      const a = coast[i]
      const b = coast[i + 1]
      const slope = (b.x - a.x) / (b.y - a.y)
      const distance = (p: { x: number; y: number }) => a.x + (p.y - a.y) * slope - p.x
      expect(distance(band.start)).toBeCloseTo(land)
      expect(distance(band.end)).toBeCloseTo(far)
    }
    expect(SEA_FADE_STOPS.positions[0]).toBe(0)
    expect(SEA_FADE_STOPS.positions[SEA_FADE_STOPS.positions.length - 1]).toBe(1)
    expect(SEA_FADE_STOPS.opacities[SEA_FADE_STOPS.opacities.length - 1]).toBe(1)
    expect(model.water.bands.length).toBeGreaterThan(40)
    expect(model.water.coast.startsWith("M")).toBe(true)
    expect(model.water.lakes).toHaveLength(2)
  })

  test("the coast is carried past the map's edges: straight north from the top, on south-west from the bottom", () => {
    const coast = [
      { x: 40, y: 0 },
      { x: 40, y: 10 },
      { x: 30, y: 30 },
      { x: 20, y: 40 },
      { x: 18, y: 41 },
      { x: 16, y: 42 },
    ]
    const extended = extendCoast(coast)
    expect(extended).toHaveLength(coast.length + 2)
    expect(extended[0]).toEqual({ x: 40, y: -SEA_REACH })
    expect(extended.slice(1, -1)).toEqual(coast)
    const last = extended[extended.length - 1]
    // On the heading of the last several units of coast, from (30, 30), not of the final short segment.
    const length = Math.hypot(14, 12)
    expect(last.x).toBeCloseTo(16 - SEA_REACH * (14 / length))
    expect(last.y).toBeCloseTo(42 + SEA_REACH * (12 / length))
    // The whole map's coast now reaches the sea's far edges on both ends.
    expect(model.water.coast.startsWith(`M47.89 ${-SEA_REACH}`)).toBe(true)
  })

  test("map names drop parentheticals and, inside a city frame, the city prefix", () => {
    expect(mapStationName("Tel Aviv - Savidor Center", true)).toBe("Savidor Center")
    expect(mapStationName("תל אביב - סבידור מרכז", true)).toBe("סבידור מרכז")
    expect(mapStationName("מרכזית המפרץ (לב המפרץ)", false)).toBe("מרכזית המפרץ")
    expect(mapStationName("Herzliya", true)).toBe("Herzliya")
  })

  test("polylines become straight-segment path data", () => {
    expect(
      polylineD([
        { x: 0, y: 0 },
        { x: 10.123, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe("M0 0 L10.12 0 L10 10")
  })

  test("smooth paths round every bend, keep straight runs straight and stations on the line", () => {
    const corner = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]
    expect(smoothPathD(corner)).toBe("M0 0 L8.7 0 Q10 0 10 1.3 L10 10")
    // A station at the corner keeps the curve within half a unit of its dot.
    expect(smoothPathD(corner, new Set([1]))).toBe("M0 0 L9.5 0 Q10 0 10 0.5 L10 10")
    expect(
      smoothPathD([
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe("M0 0 L5 0 L10 0")
    expect(model.lines.every((l) => l.d.includes("Q"))).toBe(true)
  })
})
