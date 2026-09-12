import { describe, expect, test } from "bun:test"

import type { DayTrips, TripData } from "../requests/gtfs-route-api"
import type { SiriSnapshot, TrainRealtime } from "../siri/types"
import {
  type AnnouncedDisruption,
  type AnnouncementItem,
  type Extraction,
  announcedDisruptionsForLine,
  normalizeExtraction,
} from "../service-status/extraction"
import { fingerprintOf, pollAnnouncements } from "../service-status/announcements"
import type { AnnouncementsState } from "../service-status/state"
import { RAIL_LINES, railLineById } from "../status/lines"
import { deriveServiceStatus } from "../status/service-status"
import { parseOffsetSec, toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-08-20"
const ts = (clock: string) => toEpochMs(DATE, parseOffsetSec(clock))
const naive = (iso: string) => Date.parse(`${iso}Z`)

const text = (en: string) => ({ he: en, en, ru: en, ar: en })

const extracted = (overrides: Partial<Extraction["disruptions"][number]> = {}): Extraction["disruptions"][number] => ({
  sourceIds: ["u1"],
  kind: "suspension",
  fromStationId: "5800",
  toStationId: "5900",
  stationIds: [],
  lineIds: [],
  windows: [{ from: "2026-08-20T00:01:00", to: "2026-08-23T04:00:00" }],
  reason: text("Infrastructure works"),
  alternatives: [{ mode: "shuttle", free: true, description: text("Free shuttles between the closed stations") }],
  link: "https://www.rail.co.il/?page=ashkelon-200826",
  confidence: "high",
  note: "test",
  ...overrides,
})

const NOW = naive("2026-08-20T09:00:00")

describe("normalizeExtraction", () => {
  test("keeps a suspension between two stations a line runs, with its windows in order", () => {
    const [d] = normalizeExtraction(
      {
        disruptions: [
          extracted({
            windows: [
              { from: "2026-08-27T22:00:00", to: "2026-08-30T04:00:00" },
              { from: "2026-08-20T00:01:00", to: "2026-08-23T04:00:00" },
            ],
          }),
        ],
      },
      NOW,
    )
    expect(d).toMatchObject({ kind: "suspension", fromStationId: "5800", toStationId: "5900", lineIds: [] })
    expect(d.windows.map((w) => w.from)).toEqual(["2026-08-20T00:01:00", "2026-08-27T22:00:00"])
    expect(d.id).toMatch(/^announcement:[0-9a-f]{10}$/)
    expect(d.link).toBe("https://www.rail.co.il/?page=ashkelon-200826")
  })

  test("drops what does not fit: unknown stations, no line on the stretch, low confidence, windows over or malformed", () => {
    const kept = normalizeExtraction(
      {
        disruptions: [
          extracted({ fromStationId: "9999" }),
          extracted({ fromStationId: "1600", toStationId: "680" }), // Nahariya – Jerusalem: no line runs it
          extracted({ confidence: "low" }),
          extracted({ windows: [{ from: "2026-08-01T00:00:00", to: "2026-08-02T04:00:00" }] }),
          extracted({ windows: [{ from: "20.8.26 00:01", to: null }] }),
          extracted({ windows: [{ from: "2026-08-23T04:00:00", to: "2026-08-20T00:01:00" }] }),
          extracted({ kind: "skippedStops", stationIds: ["9999"] }),
        ],
      },
      NOW,
    )
    expect(kept).toEqual([])
  })

  test("closed stations keep only known ids, once each, and a bad link is dropped", () => {
    const [d] = normalizeExtraction(
      { disruptions: [extracted({ kind: "skippedStops", stationIds: ["1600", "1500", "1500", "9999"], link: "rail.co.il" })] },
      NOW,
    )
    expect(d).toMatchObject({ kind: "skippedStops", stationIds: ["1600", "1500"] })
    expect(d.link).toBeUndefined()
  })
})

describe("announcedDisruptionsForLine", () => {
  const line2 = railLineById.get("2")!
  const announced = normalizeExtraction({ disruptions: [extracted()] }, NOW)

  test("a suspended stretch flags that part of every line running it", () => {
    const [d] = announcedDisruptionsForLine(line2, announced, NOW)
    expect(d).toMatchObject({
      kind: "suspension",
      level: "partSuspended",
      source: "announcement",
      section: { fromStationId: "5800", toStationId: "5900", stationIds: ["5800", "5900"] },
      trains: [],
      validity: { from: "2026-08-20T00:01:00", to: "2026-08-23T04:00:00" },
    })
    expect(d.reason?.en).toBe("Infrastructure works")
    expect(d.alternatives?.[0]).toMatchObject({ mode: "shuttle", free: true })
    // Line 7 (Herzliya – Jerusalem) does not run Ashdod – Ashkelon.
    expect(announcedDisruptionsForLine(railLineById.get("7")!, announced, NOW)).toEqual([])
  })

  test("the whole corridor suspended makes the line suspended", () => {
    const [first] = line2.stationIds
    const last = line2.stationIds[line2.stationIds.length - 1]
    const whole = normalizeExtraction({ disruptions: [extracted({ fromStationId: first, toStationId: last })] }, NOW)
    expect(announcedDisruptionsForLine(line2, whole, NOW)[0].level).toBe("suspended")
  })

  test("closed stations flag just those stations, on the lines calling there", () => {
    const closed = normalizeExtraction(
      { disruptions: [extracted({ kind: "skippedStops", stationIds: ["1600", "1400", "1820"] })] },
      NOW,
    )
    const [d] = announcedDisruptionsForLine(railLineById.get("1")!, closed, NOW)
    expect(d).toMatchObject({
      kind: "skippedStops",
      level: "minorDelays",
      section: { fromStationId: "1600", toStationId: "1400", stationIds: ["1600", "1400"] },
    })
    expect(announcedDisruptionsForLine(line2, closed, NOW)).toEqual([])
  })

  test("only the named lines that run the stations, and only while a window is in force", () => {
    const restricted = normalizeExtraction({ disruptions: [extracted({ lineIds: ["6", "7", "nope"] })] }, NOW)
    // Line 7 (Herzliya – Jerusalem) does not run Ashdod – Ashkelon: named in vain.
    expect(restricted[0].lineIds).toEqual(["6"])
    expect(announcedDisruptionsForLine(line2, restricted, NOW)).toEqual([])
    // Naming only lines that do not run the stretch is no restriction at all.
    const unnamed = normalizeExtraction({ disruptions: [extracted({ lineIds: ["7"] })] }, NOW)
    expect(unnamed[0].lineIds).toEqual([])
    expect(announcedDisruptionsForLine(line2, unnamed, NOW)).toHaveLength(1)
    expect(announcedDisruptionsForLine(line2, announced, naive("2026-08-19T23:00:00"))).toEqual([])
    expect(announcedDisruptionsForLine(line2, announced, naive("2026-08-23T04:00:00"))).toEqual([])
  })

  test("an open-ended window lasts a day", () => {
    const open = normalizeExtraction({ disruptions: [extracted({ windows: [{ from: "2026-08-20T08:00:00", to: null }] })] }, NOW)
    expect(announcedDisruptionsForLine(line2, open, NOW)[0].validity).toEqual({ from: "2026-08-20T08:00:00", to: null })
    expect(announcedDisruptionsForLine(line2, open, naive("2026-08-21T08:00:00"))).toEqual([])
  })
})

// --- laid over the live status ---------------------------------------------------------

const trip = (trainNumber: number, stops: [number, string][]): TripData => ({
  tripKey: `${DATE}#trip-${trainNumber}`,
  trainNumber,
  routeId: "r",
  stops: stops.map(([railId, clock]) => ({ railId, platform: 1, arrTs: ts(clock), depTs: ts(clock) })),
})

const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

const NOW_REAL = Date.parse("2026-08-20T09:00:00+03:00")
const snapshot = (trains: Record<number, Partial<TrainRealtime>>): SiriSnapshot => ({
  updatedAt: NOW_REAL,
  feedId: "1",
  trains: Object.fromEntries(
    Object.entries(trains).map(([n, t]) => [`${DATE}#${n}`, { routeId: "r", latestDelayMin: 0, stations: {}, ...t }]),
  ),
})

// Binyamina – Ashkelon (line 2) between Herzliya and Ashkelon.
const line2Train = (n: number, dep = "08:30") =>
  trip(n, [
    [3500, dep],
    [3700, "08:40"],
    [4900, "08:50"],
    [5000, "09:05"],
    [5200, "09:15"],
    [5800, "09:35"],
    [5900, "09:50"],
  ])

const derive = (trips: DayTrips, snap: SiriSnapshot | null, announced: AnnouncedDisruption[]) =>
  deriveServiceStatus({
    trips,
    snapshot: snap,
    announced,
    announcementsUpdatedAt: "2026-08-20T06:00:00.000Z",
    nowNaiveMs: ts("09:00"),
    nowRealMs: NOW_REAL,
    serviceDate: DATE,
  })

const line = (status: ReturnType<typeof derive>, id: string) => status.lines.find((l) => l.lineId === id)!

describe("deriveServiceStatus with announcements", () => {
  const announced = normalizeExtraction({ disruptions: [extracted()] }, NOW)

  test("an announced suspension explains the live trains ending short, and takes them", () => {
    const status = derive(
      table(line2Train(230), line2Train(232, "08:45")),
      snapshot({ 230: { liveDestRailId: 5800 }, 232: { liveDestRailId: 5800, latestDelayMin: 6 } }),
      announced,
    )
    const l2 = line(status, "2")
    expect(l2.level).toBe("partSuspended")
    expect(l2.disruptions.map((d) => [d.kind, d.source])).toEqual([
      ["suspension", "announcement"],
      ["delays", "realtime"],
    ])
    expect(l2.disruptions[0].trains.map((t) => [t.trainNumber, t.status])).toEqual([
      [230, "curtailed"],
      [232, "curtailed"],
    ])
    expect(l2.disruptions[0].reason?.he).toBe("Infrastructure works")
    expect(status.announcements.updatedAt).toBe("2026-08-20T06:00:00.000Z")
  })

  test("a live disruption outside the announced stretch stays its own", () => {
    const status = derive(
      table(line2Train(230), line2Train(232, "08:45")),
      snapshot({ 230: { cancelled: true }, 232: { latestDelayMin: 0 } }),
      announced,
    )
    const kinds = line(status, "2").disruptions.map((d) => d.kind)
    expect(kinds).toEqual(["suspension", "cancellations"])
  })

  test("an announcement counts even when the live feed is down, and not when nothing is scheduled", () => {
    const jerusalemTrain = trip(704, [
      [3500, "08:30"],
      [680, "09:30"],
    ])
    const noFeed = derive(table(line2Train(230), jerusalemTrain), null, announced)
    expect(line(noFeed, "2").level).toBe("partSuspended")
    expect(line(noFeed, "2").disruptions[0].source).toBe("announcement")
    // Herzliya – Jerusalem has a train but no announcement: unknown, as before.
    expect(line(noFeed, "7").level).toBe("unknown")

    const nothing = derive(table(), snapshot({}), announced)
    expect(line(nothing, "2")).toMatchObject({ level: "noService", disruptions: [] })
  })

  test("without announcements everything is as it was", () => {
    const status = derive(table(line2Train(230)), snapshot({ 230: { latestDelayMin: 2 } }), [])
    expect(line(status, "2")).toMatchObject({ level: "goodService", disruptions: [] })
    expect(status.announcements.updatedAt).toBe("2026-08-20T06:00:00.000Z")
    expect(RAIL_LINES.length).toBe(status.lines.length)
  })
})

// --- the poll --------------------------------------------------------------------------

const item = (id: string, content: string): AnnouncementItem => ({
  id,
  date: "20.08.2026",
  link: null,
  stationIds: [],
  he: { header: `header ${id}`, content },
})

describe("pollAnnouncements", () => {
  test("the fingerprint ignores order and changes with the text", () => {
    const a = fingerprintOf([item("1", "x"), item("2", "y")])
    expect(fingerprintOf([item("2", "y"), item("1", "x")])).toBe(a)
    expect(fingerprintOf([item("1", "x"), item("2", "z")])).not.toBe(a)
  })

  test("an unchanged feed is not read again; a changed one is, and the result stored", async () => {
    const items = [item("1", "works")]
    let extractCalls = 0
    const written: AnnouncementsState[] = []
    const deps = {
      fetch: async () => items,
      extract: async () => {
        extractCalls += 1
        return { disruptions: [extracted()] }
      },
      write: async (state: AnnouncementsState) => {
        written.push(state)
      },
      nowNaiveMs: () => NOW,
      nowReal: () => new Date(NOW_REAL),
    }

    const first = await pollAnnouncements({ ...deps, previous: async () => null })
    expect(extractCalls).toBe(1)
    expect(first.disruptions).toHaveLength(1)
    expect(first.items).toEqual([{ id: "1", header: "header 1" }])

    const second = await pollAnnouncements({ ...deps, previous: async () => first, nowReal: () => new Date(NOW_REAL + 60_000) })
    expect(extractCalls).toBe(1)
    expect(second.disruptions).toBe(first.disruptions)
    expect(second.fetchedAt).not.toBe(first.fetchedAt)
    expect(second.extractedAt).toBe(first.extractedAt)

    await pollAnnouncements({ ...deps, fetch: async () => [item("1", "works, changed")], previous: async () => first })
    expect(extractCalls).toBe(2)
    expect(written).toHaveLength(3)
  })
})
