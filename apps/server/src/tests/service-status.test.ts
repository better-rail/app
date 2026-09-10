import { describe, expect, test } from "bun:test"

import type { DayTrips, TripData } from "../requests/gtfs-route-api"
import type { SiriSnapshot, TrainRealtime } from "../siri/types"
import { RAIL_LINES, railLineById } from "../status/lines"
import { assignLine, deriveServiceStatus } from "../status/service-status"
import { parseOffsetSec, toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-09-10"
const ts = (clock: string) => toEpochMs(DATE, parseOffsetSec(clock))

/** [railId, "HH:MM"] pairs → a trip; arrival == departure at every stop. */
const trip = (trainNumber: number, stops: [number, string][]): TripData => ({
  tripKey: `${DATE}#trip-${trainNumber}`,
  trainNumber,
  routeId: "r",
  stops: stops.map(([railId, clock]) => ({ railId, platform: 1, arrTs: ts(clock), depTs: ts(clock) })),
})

const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

const NOW_REAL = Date.parse("2026-09-10T09:00:00+03:00")
const snapshot = (trains: Record<number, Partial<TrainRealtime>>, updatedAt = NOW_REAL): SiriSnapshot => ({
  updatedAt,
  feedId: "1",
  trains: Object.fromEntries(
    Object.entries(trains).map(([n, t]) => [`${DATE}#${n}`, { routeId: "r", latestDelayMin: 0, stations: {}, ...t }]),
  ),
})

const derive = (trips: DayTrips, snap: SiriSnapshot | null, now = "09:00") =>
  deriveServiceStatus({ trips, snapshot: snap, nowNaiveMs: ts(now), nowRealMs: NOW_REAL, serviceDate: DATE })

const lineStatus = (trips: DayTrips, snap: SiriSnapshot | null, lineId: string, now?: string) => {
  const status = derive(trips, snap, now)
  const line = status.lines.find((l) => l.lineId === lineId)
  if (!line) throw new Error(`line ${lineId} missing`)
  return line
}

// Binyamina – Ashkelon (line 2, train numbers 217–296) between Herzliya and Ashkelon.
const line2Train = (n: number, dep = "08:30") =>
  trip(n, [
    [3500, dep],
    [3700, add(dep, 10)],
    [4900, add(dep, 20)],
    [5000, add(dep, 35)],
    [5200, add(dep, 45)],
    [5800, add(dep, 65)],
    [5900, add(dep, 80)],
  ])

function add(clock: string, minutes: number): string {
  const total = parseOffsetSec(clock) / 60 + minutes
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

describe("line assignment", () => {
  test("known train numbers map to their catalogue line", () => {
    expect(assignLine(line2Train(230))).toBe("2")
    expect(
      assignLine(
        trip(704, [
          [3500, "08:00"],
          [680, "09:00"],
        ]),
      ),
    ).toBe("7")
    expect(
      assignLine(
        trip(401, [
          [1840, "08:00"],
          [7320, "11:00"],
        ]),
      ),
    ).toBe("3X")
  })

  test("an unlisted train number falls back to the shortest corridor containing its stops", () => {
    // Herzliya → Ben Gurion → Jerusalem exists only on line 7's corridor.
    expect(
      assignLine(
        trip(55555, [
          [3500, "08:00"],
          [4900, "08:20"],
          [8600, "08:35"],
          [680, "09:00"],
        ]),
      ),
    ).toBe("7")
    // Reverse direction still matches.
    expect(
      assignLine(
        trip(55556, [
          [7500, "08:00"],
          [7300, "08:40"],
        ]),
      ),
    ).toBe("8")
    // Stops that no corridor holds in this order stay unassigned.
    expect(
      assignLine(
        trip(55557, [
          [1600, "08:00"],
          [680, "10:00"],
        ]),
      ),
    ).toBeUndefined()
  })

  test("every catalogue train number belongs to exactly one line", () => {
    const seen = new Map<number, string>()
    for (const line of RAIL_LINES) {
      for (const n of line.trainNumbers) {
        expect(seen.get(n)).toBeUndefined()
        seen.set(n, line.id)
      }
    }
  })
})

describe("levels", () => {
  test("good service when the running trains are on time", () => {
    const status = lineStatus(table(line2Train(230), line2Train(232, "09:10")), snapshot({ 230: { latestDelayMin: 2 } }), "2")
    expect(status.level).toBe("goodService")
    expect(status.disruptions).toEqual([])
    expect(status.trains).toEqual({ active: 2, delayed: 0, cancelled: 0, maxDelayMinutes: 2 })
  })

  test("minor delays from a single short delay", () => {
    const status = lineStatus(table(line2Train(230)), snapshot({ 230: { latestDelayMin: 7 } }), "2")
    expect(status.level).toBe("minorDelays")
    expect(status.disruptions).toHaveLength(1)
    const [delays] = status.disruptions
    expect(delays.kind).toBe("delays")
    expect(delays.section).toBeNull()
    expect(delays.trains[0]).toMatchObject({
      trainNumber: 230,
      status: "delayed",
      delayMinutes: 7,
      originStationId: "3500",
      destinationStationId: "5900",
      departureTime: "2026-09-10T08:30:00",
      arrivalTime: "2026-09-10T09:50:00",
      nextStationId: "5000", // 09:05 scheduled + 7 min ≥ 09:00
    })
  })

  test("severe delays once a train is 15 minutes late", () => {
    const status = lineStatus(table(line2Train(230)), snapshot({ 230: { latestDelayMin: 15 } }), "2")
    expect(status.level).toBe("severeDelays")
  })

  test("severe delays when half the running trains are late, even if each is short", () => {
    const trips = table(line2Train(230, "08:20"), line2Train(232, "08:40"), line2Train(234, "08:50"), line2Train(236, "09:05"))
    const status = lineStatus(
      trips,
      snapshot({ 230: { latestDelayMin: 6 }, 232: { latestDelayMin: 6 }, 234: { latestDelayMin: 8 } }),
      "2",
    )
    expect(status.level).toBe("severeDelays")
    expect(status.trains.delayed).toBe(3)
  })

  test("negative predictions are clamped to zero", () => {
    const status = lineStatus(table(line2Train(230)), snapshot({ 230: { latestDelayMin: -4 } }), "2")
    expect(status.level).toBe("goodService")
    expect(status.trains.maxDelayMinutes).toBe(0)
  })

  test("one cancelled train is severe, two sharing a stretch are part suspended on it", () => {
    const one = lineStatus(table(line2Train(230), line2Train(232, "09:10")), snapshot({ 230: { cancelled: true } }), "2")
    expect(one.level).toBe("severeDelays")
    expect(one.disruptions[0]).toMatchObject({ kind: "cancellations", section: null })
    expect(one.disruptions[0].trains[0].status).toBe("cancelled")

    const short = trip(240, [
      [4900, "08:50"],
      [5000, "09:05"],
      [5200, "09:15"],
    ])
    const two = lineStatus(
      table(line2Train(230), short, line2Train(232, "09:10")),
      snapshot({ 230: { cancelled: true }, 240: { cancelled: true } }),
      "2",
    )
    expect(two.level).toBe("partSuspended")
    expect(two.disruptions[0].section).toEqual({
      fromStationId: "4900",
      toStationId: "5200",
      stationIds: ["4900", "4800", "5150", "5000", "5300", "5200"],
    })
    expect(two.trains.cancelled).toBe(2)
  })

  test("a curtailed run flags the unserved stretch as part suspended", () => {
    const status = lineStatus(table(line2Train(230)), snapshot({ 230: { liveDestRailId: 5200, latestDelayMin: 3 } }), "2")
    expect(status.level).toBe("partSuspended")
    const [curtailment] = status.disruptions
    expect(curtailment.kind).toBe("curtailment")
    // The fixture skips Yavne East, so the unserved stretch starts at Ashdod.
    expect(curtailment.section).toEqual({
      fromStationId: "5800",
      toStationId: "5900",
      stationIds: ["5800", "5900"],
    })
    expect(curtailment.trains[0]).toMatchObject({ status: "curtailed", actualDestinationStationId: "5200" })
  })

  test("skipped stops are a minor disruption on the skipped stations", () => {
    const status = lineStatus(
      table(line2Train(230)),
      snapshot({ 230: { stations: { "5200": { delayMin: null, status: "cancelled" } } } }),
      "2",
    )
    expect(status.level).toBe("minorDelays")
    expect(status.disruptions[0]).toMatchObject({
      kind: "skippedStops",
      section: { fromStationId: "5200", toStationId: "5200", stationIds: ["5200"] },
    })
    expect(status.disruptions[0].trains[0].skippedStationIds).toEqual(["5200"])
  })

  test("every active train cancelled means the line is suspended", () => {
    const status = lineStatus(
      table(line2Train(230), line2Train(232, "09:10")),
      snapshot({ 230: { cancelled: true }, 232: { cancelled: true } }),
      "2",
    )
    expect(status.level).toBe("suspended")
    expect(status.disruptions[0].kind).toBe("suspension")
    expect(status.disruptions[0].section?.stationIds).toEqual(railLineById.get("2")?.stationIds)
  })

  test("disruptions are ordered worst first and the line takes the worst level", () => {
    const status = lineStatus(
      table(line2Train(230), line2Train(232, "08:40"), line2Train(234, "09:10")),
      snapshot({ 230: { latestDelayMin: 6 }, 232: { liveDestRailId: 5800 } }),
      "2",
    )
    expect(status.level).toBe("partSuspended")
    expect(status.disruptions.map((d) => d.kind)).toEqual(["curtailment", "delays"])
  })
})

describe("service windows", () => {
  test("no service when nothing runs or departs within 90 minutes", () => {
    const status = lineStatus(table(line2Train(230, "12:00")), snapshot({}), "2", "09:00")
    expect(status.level).toBe("noService")
    expect(status.trains.active).toBe(0)
  })

  test("good service when the first train is still to depart within the window", () => {
    expect(lineStatus(table(line2Train(230, "10:15")), snapshot({}), "2", "09:00").level).toBe("goodService")
  })

  test("a train about to depart already counts as active", () => {
    expect(lineStatus(table(line2Train(230, "09:20")), snapshot({ 230: { latestDelayMin: 20 } }), "2", "09:00").level).toBe(
      "severeDelays",
    )
  })

  test("a delayed train stays active until its delayed arrival", () => {
    // Scheduled arrival 09:50; 25 minutes late it is still on its way at 10:05.
    expect(lineStatus(table(line2Train(230)), snapshot({ 230: { latestDelayMin: 25 } }), "2", "10:05").level).toBe("severeDelays")
    expect(lineStatus(table(line2Train(230)), snapshot({ 230: { latestDelayMin: 25 } }), "2", "10:20").level).toBe("noService")
  })
})

describe("realtime availability", () => {
  test("a missing snapshot leaves running lines unknown", () => {
    const status = derive(table(line2Train(230)), null)
    expect(status.realtime).toEqual({ available: false, updatedAt: null })
    expect(status.lines.find((l) => l.lineId === "2")?.level).toBe("unknown")
    expect(status.lines.find((l) => l.lineId === "7")?.level).toBe("noService")
    expect(status.network.level).toBe("unknown")
  })

  test("a stale snapshot counts as unavailable", () => {
    const stale = snapshot({ 230: { latestDelayMin: 30 } }, NOW_REAL - 20 * 60_000)
    const status = derive(table(line2Train(230)), stale)
    expect(status.realtime.available).toBe(false)
    expect(status.lines.find((l) => l.lineId === "2")?.level).toBe("unknown")
  })
})

describe("network summary", () => {
  test("counts every line and takes the worst level among lines with service", () => {
    const status = derive(
      table(
        line2Train(230),
        trip(704, [
          [3500, "08:50"],
          [680, "09:40"],
        ]),
      ),
      snapshot({ 230: { latestDelayMin: 20 } }),
    )
    expect(status.schemaVersion).toBe(1)
    expect(status.serviceDate).toBe(DATE)
    expect(status.network.level).toBe("severeDelays")
    expect(status.network.counts.severeDelays).toBe(1)
    expect(status.network.counts.goodService).toBe(1)
    expect(status.network.counts.noService).toBe(RAIL_LINES.length - 2)
    expect(status.lines.map((l) => l.lineId)).toEqual(RAIL_LINES.map((l) => l.id))
    expect(status.lines[0].line).toMatchObject({ badge: "1", color: "#B1DB1F", name: { en: "Nahariya – Modi'in" } })
  })
})
