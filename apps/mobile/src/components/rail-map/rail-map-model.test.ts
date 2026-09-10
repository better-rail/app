import { describe, expect, test } from "bun:test"
import { RAIL_LINES } from "@/data/rail-lines"
import { STATION_LABELS } from "@/data/rail-map-layout"
import {
  buildRailMapModel,
  currentDayType,
  linePathBetween,
  lineStationPoints,
  mapStationName,
  nearestLine,
  polylineD,
  smoothPathD,
} from "./rail-map-model"

describe("rail map model", () => {
  const model = buildRailMapModel("weekday")

  test("the weekend map drops the lines that do not run then, with their stations, stubs and badges", () => {
    const weekend = buildRailMapModel("weekend")
    expect(weekend.dayType).toBe("weekend")
    expect(model.lines.map((l) => l.lineId)).toContain("12")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("12")
    expect(weekend.lines.map((l) => l.lineId)).not.toContain("3X")
    // Hadera East is only on the eastern line.
    expect(model.labels.some((l) => l.stationId === "3900")).toBe(true)
    expect(weekend.labels.some((l) => l.stationId === "3900")).toBe(false)
    expect(weekend.badges.some((b) => b.lineId === "12")).toBe(false)
    // Hardly any line 2 train ends at Rehovot on the weekend: no stub, no badge, a plain stop.
    expect(weekend.extras.map((e) => e.lineId)).toEqual(["6"])
    expect(weekend.markers.find((m) => m.stationId === "5200" && m.lineId === "2")?.kind).toBe("stop")
    expect(weekend.badges.filter((b) => b.lineId === "2")).toHaveLength(2)
    expect(model.badges.filter((b) => b.lineId === "2")).toHaveLength(3)
  })

  test("the day type follows the Israeli week, with the service day rolling over at 03:00", () => {
    expect(currentDayType(new Date("2026-09-09T12:00:00"))).toBe("weekday") // Wednesday
    expect(currentDayType(new Date("2026-09-11T12:00:00"))).toBe("weekend") // Friday
    expect(currentDayType(new Date("2026-09-12T23:00:00"))).toBe("weekend") // Saturday night
    expect(currentDayType(new Date("2026-09-11T01:00:00"))).toBe("weekday") // Thursday's last trains
    expect(currentDayType(new Date("2026-09-13T01:00:00"))).toBe("weekend") // Saturday's last trains
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
    // Where a line calls comes from the timetable: on weekends a quarter of the Karmiel trains run through Kiryat Hayim.
    const kiryatHayim = (m: ReturnType<typeof buildRailMapModel>) =>
      Object.fromEntries(m.markers.filter((mk) => mk.stationId === "700").map((mk) => [mk.lineId, mk.kind]))
    expect(kiryatHayim(model)).toEqual({ "1": "stop", "3": "stop", "4": "stop" })
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

  test("city frames, terminal badges, irregular stretches and the aeroplane come from the traced layout", () => {
    expect(model.cities.map((c) => c.id)).toEqual(["haifa", "telaviv", "jerusalem", "beersheva"])
    expect(model.badges.some((b) => b.lineId === "2")).toBe(true)
    expect(model.badges.every((b) => b.line.id === b.lineId)).toBe(true)
    // The Netanya – Tel Aviv University stretch of the light-blue lane runs at irregular intervals.
    expect(model.irregular.map((s) => s.lineId).sort()).toEqual(["25", "5"])
    expect(model.irregular.every((s) => s.d.startsWith("M"))).toBe(true)
    expect(model.airport.height).toBeGreaterThan(0)
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
