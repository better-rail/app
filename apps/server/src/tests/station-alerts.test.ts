import { describe, expect, test } from "bun:test"

import {
  type AlertMemory,
  CLEARED_WINDOW_MS,
  CONFIRM_MS,
  MIN_GAP_MS,
  type StationAlertState,
  decideAlert,
  deriveStationAlertState,
} from "../station-alerts/derive"
import { currentDayType } from "../station-alerts/day-type"
import { alertMessage } from "../station-alerts/message"
import { railLineById } from "../status/lines"
import type { Disruption, LineStatus, ServiceStatusLevel, ServiceStatusSnapshot } from "../types/service-status"
import type { StationDeparture, StationDepartures } from "../types/station-departures"

// Line 2 (Binyamina – Ashkelon) calls at Herzliya (3500), Savidor (3700), HaHagana (4900), Lod (5000)…
// Line 1 (Nahariya – Modi'in) also calls at Herzliya and Savidor.
const HERZLIYA = "3500"
const SAVIDOR = "3700"
const LOD = "5000"

const line = (lineId: string, level: ServiceStatusLevel, disruptions: Disruption[] = []): LineStatus => {
  const def = railLineById.get(lineId as never)
  if (!def) throw new Error(`no line ${lineId}`)
  return {
    lineId,
    level,
    disruptions,
    trains: { active: 4, delayed: 0, cancelled: 0, maxDelayMinutes: 0 },
    line: { badge: def.badge, color: def.color, name: def.name, stationIds: def.stationIds },
  }
}

const disruption = (
  id: string,
  kind: Disruption["kind"],
  level: ServiceStatusLevel,
  stationIds: string[],
  extra: Partial<Disruption> = {},
): Disruption => ({
  id,
  kind,
  level,
  section: stationIds.length
    ? { fromStationId: stationIds[0], toStationId: stationIds[stationIds.length - 1], stationIds }
    : null,
  trains: [],
  source: "realtime",
  ...extra,
})

const snapshot = (lines: LineStatus[]): ServiceStatusSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-09-10T06:00:00.000Z",
  serviceDate: "2026-09-10",
  realtime: { available: true, updatedAt: "2026-09-10T06:00:00.000Z" },
  announcements: { updatedAt: null },
  timetable: { checkedAt: null, available: false },
  network: {
    level: "goodService",
    counts: { goodService: 1, minorDelays: 0, severeDelays: 0, partSuspended: 0, suspended: 0, noService: 0, unknown: 0 },
  },
  lines,
})

const NOW = Date.parse("2026-09-10T09:00:00Z") // naive: 09:00 Israel time

const train = (clock: string, extra: Partial<StationDeparture> = {}): StationDeparture => ({
  trainNumber: 230,
  time: `2026-09-10T${clock}:00`,
  delayMinutes: 0,
  platform: 1,
  destinationStationId: "5900",
  cancelled: false,
  live: true,
  ...extra,
})

const departures = (byLine: Record<string, StationDeparture[]>, available = true): StationDepartures => ({
  schemaVersion: 1,
  stationId: HERZLIYA,
  generatedAt: "2026-09-10T06:00:00.000Z",
  realtime: { available },
  lines: Object.entries(byLine).map(([lineId, trains]) => ({ lineId, directions: [{ towardsStationId: "5900", trains }] })),
})

const derive = (
  snap: ServiceStatusSnapshot,
  deps: StationDepartures | null,
  lineIds: string[] | null = null,
  stationId = HERZLIYA,
) => deriveStationAlertState({ snapshot: snap, departures: deps, stationId, lineIds, nowNaiveMs: NOW })

describe("a station's alert state", () => {
  test("good service when its lines run and its own trains are fine", () => {
    const state = derive(snapshot([line("1", "goodService"), line("2", "goodService")]), departures({ "2": [train("09:10")] }))
    expect(state.kind).toBe("good")
    expect(state.signature).toBe("good")
  })

  test("no service when no line through it has trains", () => {
    expect(derive(snapshot([line("1", "noService"), line("2", "noService")]), departures({})).kind).toBe("noService")
    expect(derive(snapshot([line("10", "goodService")]), departures({})).kind).toBe("noService")
  })

  test("unknown without live data", () => {
    expect(derive(snapshot([line("2", "unknown")]), departures({ "2": [train("09:10")] }, false)).kind).toBe("unknown")
  })

  test("a suspension naming the station is the story, even when the line is fine elsewhere", () => {
    const suspended = disruption("suspension:3500-3700", "suspension", "suspended", [HERZLIYA, SAVIDOR])
    const state = derive(snapshot([line("2", "suspended", [suspended]), line("1", "goodService")]), departures({}))
    expect(state.kind).toBe("cancellations")
    expect(state.level).toBe("suspended")
    expect(state.headline?.lineId).toBe("2")
    expect(state.signature).toBe("cancellations:suspension:3500-3700")
  })

  test("a disruption elsewhere on the line is not the station's news", () => {
    const suspended = disruption("suspension:5000-5900", "suspension", "suspended", [LOD, "5200", "5800", "5900"])
    const state = derive(snapshot([line("2", "suspended", [suspended])]), departures({ "2": [train("09:10")] }))
    expect(state.kind).toBe("good")
  })

  test("the station's own next trains decide delays and cancellations", () => {
    const delays = disruption("delays", "delays", "minorDelays", [])
    const snap = snapshot([line("2", "minorDelays", [delays])])
    // One train a few minutes late is nothing.
    expect(derive(snap, departures({ "2": [train("09:10", { delayMinutes: 6 }), train("09:30")] })).kind).toBe("good")
    // Two late trains are delays.
    const late = derive(snap, departures({ "2": [train("09:10", { delayMinutes: 6 }), train("09:30", { delayMinutes: 8 })] }))
    expect(late.kind).toBe("delays")
    expect(late.level).toBe("minorDelays")
    expect(late.trains.maxDelayMinutes).toBe(8)
    // A cancelled train is severe, two leave the station part suspended.
    const one = derive(snap, departures({ "2": [train("09:10", { cancelled: true }), train("09:30")] }))
    expect(one.kind).toBe("cancellations")
    expect(one.level).toBe("severeDelays")
    const two = derive(snap, departures({ "2": [train("09:10", { cancelled: true }), train("09:30", { cancelled: true })] }))
    expect(two.level).toBe("partSuspended")
    // Trains beyond the horizon do not count.
    expect(derive(snap, departures({ "2": [train("11:10", { cancelled: true })] })).kind).toBe("good")
  })

  test("only the lines asked about count", () => {
    const suspended = disruption("suspension:3500-3700", "suspension", "suspended", [HERZLIYA, SAVIDOR])
    const snap = snapshot([line("2", "suspended", [suspended]), line("1", "goodService")])
    const deps = departures({ "1": [train("09:05", { cancelled: true }), train("09:15", { cancelled: true })], "2": [] })
    expect(derive(snap, deps, ["1"]).signature).toBe("cancellations:trains")
    expect(derive(snap, deps, ["2"]).signature).toBe("cancellations:suspension:3500-3700")
    expect(derive(snap, deps, ["7"]).kind).toBe("noService")
  })

  test("an announcement naming the station is planned works", () => {
    const works = disruption("announcement:abc", "suspension", "suspended", [HERZLIYA, SAVIDOR], {
      source: "announcement",
      reason: { he: "עבודות", en: "Works", ru: "Работы", ar: "أعمال" },
    })
    const state = derive(snapshot([line("2", "suspended", [works])]), departures({ "2": [train("09:10")] }))
    expect(state.kind).toBe("planned")
    expect(state.headline?.reason?.en).toBe("Works")
  })
})

const state = (kind: StationAlertState["kind"], level: ServiceStatusLevel, signature: string): StationAlertState => ({
  kind,
  level,
  signature,
  trains: { maxDelayMinutes: 0, cancelled: 0, late: 0, lineIds: [] },
})

const GOOD = state("good", "goodService", "good")
const DELAYS = state("delays", "minorDelays", "delays:trains")
const SEVERE = state("delays", "severeDelays", "delays:trains")
const SUSPENDED = state("cancellations", "suspended", "cancellations:suspension:3500-3700")
const NO_SERVICE = state("noService", "noService", "noService")
const UNKNOWN = state("unknown", "unknown", "unknown")

/** Walk the decision through a series of (state, time) observations, returning the pushes. */
const walk = (steps: [StationAlertState, number][], start?: AlertMemory) => {
  let memory = start
  const pushes: string[] = []
  for (const [s, at] of steps) {
    const decision = decideAlert(memory, s, at)
    memory = decision.memory
    if (decision.push) pushes.push(`${decision.push}@${at}`)
  }
  return { pushes, memory: memory ?? {} }
}

describe("whether to push", () => {
  test("a new disruption is pushed once it has held for a cycle, and not again while it lasts", () => {
    const { pushes } = walk([
      [GOOD, 0],
      [SEVERE, 60_000],
      [SEVERE, 60_000 + CONFIRM_MS],
      [SEVERE, 60_000 + CONFIRM_MS + 60_000],
      [SEVERE, 60_000 + CONFIRM_MS + 600_000],
    ])
    expect(pushes).toEqual([`disruption@${60_000 + CONFIRM_MS}`])
  })

  test("a blip that does not hold is never pushed", () => {
    const { pushes, memory } = walk([
      [SEVERE, 0],
      [GOOD, 30_000],
      [GOOD, 30_000 + CONFIRM_MS],
    ])
    expect(pushes).toEqual([])
    expect(memory.notified).toBeUndefined()
  })

  test("getting worse is pushed again right away; getting better is not", () => {
    const { pushes } = walk([
      [SEVERE, 0],
      [SEVERE, CONFIRM_MS],
      [{ ...SUSPENDED, signature: "cancellations:trains" }, CONFIRM_MS + 60_000],
      [{ ...SUSPENDED, signature: "cancellations:trains" }, CONFIRM_MS + 60_000 + CONFIRM_MS],
      [SEVERE, CONFIRM_MS + 60_000 + CONFIRM_MS + 60_000],
      [SEVERE, CONFIRM_MS + 60_000 + CONFIRM_MS + 60_000 + CONFIRM_MS],
    ])
    expect(pushes).toEqual([`disruption@${CONFIRM_MS}`, `disruption@${CONFIRM_MS + 60_000 + CONFIRM_MS}`])
  })

  test("a different story at the same level waits out the gap", () => {
    const t1 = CONFIRM_MS
    const { pushes } = walk([
      [SUSPENDED, 0],
      [SUSPENDED, t1],
      [{ ...SUSPENDED, signature: "cancellations:suspension:3500-4900" }, t1 + 60_000],
      [{ ...SUSPENDED, signature: "cancellations:suspension:3500-4900" }, t1 + 60_000 + CONFIRM_MS],
      [{ ...SUSPENDED, signature: "cancellations:suspension:3500-4900" }, t1 + MIN_GAP_MS],
    ])
    expect(pushes).toEqual([`disruption@${t1}`, `disruption@${t1 + MIN_GAP_MS}`])
  })

  test("an all-clear follows a reported disruption, once, and only soon after", () => {
    const soon = walk([
      [SEVERE, 0],
      [SEVERE, CONFIRM_MS],
      [GOOD, CONFIRM_MS + 60_000],
      [GOOD, CONFIRM_MS + 60_000 + CONFIRM_MS],
      [GOOD, CONFIRM_MS + 60_000 + CONFIRM_MS + 60_000],
    ])
    expect(soon.pushes).toEqual([`disruption@${CONFIRM_MS}`, `cleared@${CONFIRM_MS + 60_000 + CONFIRM_MS}`])
    expect(soon.memory.notified).toBeUndefined()

    const late = walk([
      [SEVERE, 0],
      [SEVERE, CONFIRM_MS],
      [GOOD, CLEARED_WINDOW_MS + CONFIRM_MS + 60_000],
      [GOOD, CLEARED_WINDOW_MS + CONFIRM_MS + 60_000 + CONFIRM_MS],
    ])
    expect(late.pushes).toEqual([`disruption@${CONFIRM_MS}`])
    expect(late.memory.notified).toBeUndefined()
  })

  test("no service and no data leave what was said standing", () => {
    const { pushes, memory } = walk([
      [SUSPENDED, 0],
      [SUSPENDED, CONFIRM_MS],
      [UNKNOWN, CONFIRM_MS + 60_000],
      [NO_SERVICE, CONFIRM_MS + 120_000],
      [SUSPENDED, CONFIRM_MS + 180_000],
      [SUSPENDED, CONFIRM_MS + 180_000 + CONFIRM_MS],
    ])
    expect(pushes).toEqual([`disruption@${CONFIRM_MS}`])
    expect(memory.notified?.signature).toBe(SUSPENDED.signature)
  })

  test("minor delays are never pushed, and hold off the all-clear while they last", () => {
    const quiet = walk([
      [DELAYS, 0],
      [DELAYS, CONFIRM_MS],
      [DELAYS, 10 * CONFIRM_MS],
    ])
    expect(quiet.pushes).toEqual([])
    expect(quiet.memory).toEqual({})

    const easing = walk([
      [SEVERE, 0],
      [SEVERE, CONFIRM_MS],
      [DELAYS, CONFIRM_MS + 60_000],
      [DELAYS, CONFIRM_MS + 120_000],
      [GOOD, CONFIRM_MS + 180_000],
      [GOOD, CONFIRM_MS + 180_000 + CONFIRM_MS],
    ])
    expect(easing.pushes).toEqual([`disruption@${CONFIRM_MS}`, `cleared@${CONFIRM_MS + 180_000 + CONFIRM_MS}`])

    // Minor delays that turn severe are pushed as severe, from when they became severe.
    const worsening = walk([
      [DELAYS, 0],
      [DELAYS, CONFIRM_MS],
      [SEVERE, 2 * CONFIRM_MS],
      [SEVERE, 3 * CONFIRM_MS],
    ])
    expect(worsening.pushes).toEqual([`disruption@${3 * CONFIRM_MS}`])
  })

  test("good service with nothing reported is quiet", () => {
    expect(
      walk([
        [GOOD, 0],
        [GOOD, CONFIRM_MS],
        [GOOD, 2 * CONFIRM_MS],
      ]).pushes,
    ).toEqual([])
  })
})

describe("the alert's words", () => {
  const suspended = disruption("suspension:3500-3700", "suspension", "suspended", [HERZLIYA, SAVIDOR])

  test("names the station and the stretch, in the device's language", () => {
    const s = derive(snapshot([line("2", "suspended", [suspended])]), departures({}))
    expect(alertMessage("disruption", s, HERZLIYA, "en", false)).toEqual({
      title: "Herzliya",
      body: "No service between Herzliya and Tel Aviv - Savidor Center",
    })
    expect(alertMessage("disruption", s, HERZLIYA, "he", false).title).toBe("הרצליה")
    expect(alertMessage("cleared", s, HERZLIYA, "en", false).body).toBe("Good service has resumed")
  })

  test("leads with the line when the device asked about particular lines", () => {
    const s = derive(snapshot([line("2", "suspended", [suspended])]), departures({}), ["2"])
    expect(alertMessage("disruption", s, HERZLIYA, "en", true).body).toBe(
      "Binyamina – Ashkelon: No service between Herzliya and Tel Aviv - Savidor Center",
    )
  })

  test("says how late the station's own trains are", () => {
    const deps = departures({ "2": [train("09:10", { delayMinutes: 6 }), train("09:30", { delayMinutes: 12 })] })
    const s = derive(snapshot([line("2", "minorDelays")]), deps)
    expect(alertMessage("disruption", s, HERZLIYA, "en", false).body).toBe("Trains are running up to 12 minutes late")
    const cancelled = derive(snapshot([line("2", "severeDelays")]), departures({ "2": [train("09:10", { cancelled: true })] }))
    expect(alertMessage("disruption", cancelled, HERZLIYA, "en", false).body).toBe("One of the next trains is cancelled")
  })

  test("planned works carry Israel Railways' reason", () => {
    const works = disruption("announcement:abc", "suspension", "suspended", [HERZLIYA, SAVIDOR], {
      source: "announcement",
      reason: { he: "עבודות תשתית", en: "Infrastructure works", ru: "", ar: "" },
    })
    const s = derive(snapshot([line("2", "suspended", [works])]), departures({}))
    expect(alertMessage("disruption", s, HERZLIYA, "ru", false).body).toBe(
      "Плановые работы: Движение между Герцлия и Тель-Авив - Мерказ - Центральная не осуществляется – Infrastructure works",
    )
  })
})

describe("the timetable's day", () => {
  test("matches the app's map: nights after Sun–Thu until 04:30, Fri–Sat service days are the weekend", () => {
    expect(currentDayType(Date.parse("2026-09-09T12:00:00Z"))).toBe("weekday") // Wednesday noon
    expect(currentDayType(Date.parse("2026-09-10T01:00:00Z"))).toBe("night") // Thursday 01:00
    expect(currentDayType(Date.parse("2026-09-10T04:30:00Z"))).toBe("weekday") // Thursday 04:30
    expect(currentDayType(Date.parse("2026-09-11T12:00:00Z"))).toBe("weekend") // Friday
    expect(currentDayType(Date.parse("2026-09-13T01:00:00Z"))).toBe("weekend") // Saturday's trains past midnight
    expect(currentDayType(Date.parse("2026-09-13T12:00:00Z"))).toBe("weekday") // Sunday
    expect(currentDayType(Date.parse("2026-09-12T01:00:00Z"))).toBe("weekend") // Saturday 01:00: no night trains after Friday
  })
})
