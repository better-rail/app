import { describe, expect, test } from "bun:test"

import type { TripData } from "../requests/gtfs-route-api"
import type { RealtimeLookup } from "../siri/types"
import {
  CONFIRM_MS,
  type GuardMemory,
  type GuardedTrip,
  MAX_DELAY_PUSHES,
  REGROWTH_MIN,
  WATCH_AFTER_MS,
  WATCH_BEFORE_MS,
  decideGuard,
  deriveGuardState,
} from "../delay-guards/derive"
import { guardMessage } from "../delay-guards/message"
import type { DelayGuard } from "../types/delay-guards"
import { parseOffsetSec, toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-09-10"
const ts = (clock: string, date = DATE) => toEpochMs(date, parseOffsetSec(clock))

const trip = (trainNumber: number, stops: [number, string][], date = DATE): GuardedTrip => ({
  serviceDate: date,
  trip: {
    tripKey: `${date}#trip-${trainNumber}`,
    trainNumber,
    routeId: "r",
    stops: stops.map(([railId, clock]) => ({ railId, platform: 1, arrTs: ts(clock, date), depTs: ts(clock, date) })),
  } satisfies TripData,
})

const guard: DelayGuard = {
  trainNumber: 230,
  originStationId: "3500",
  destinationStationId: "5900",
  departureTime: "08:30",
  thresholdMinutes: 3,
}

const run = trip(230, [
  [3500, "08:30"],
  [3700, "08:40"],
  [5900, "09:50"],
])

const lookupWith =
  (delayMin: number, extra: Partial<ReturnType<RealtimeLookup>> = {}): RealtimeLookup =>
  () => ({ delayMin, ...extra })

describe("a guarded train's state", () => {
  test("is watched from three hours before its departure until a few minutes after it (delay included)", () => {
    const state = (clock: string, delay = 0) => deriveGuardState(guard, [run], lookupWith(delay), true, ts(clock))
    expect(state("05:29").status).toBe("outsideWindow")
    expect(state("05:31").status).toBe("watching")
    expect(state("08:34").status).toBe("watching")
    expect(state("08:36").status).toBe("outsideWindow")
    expect(state("08:44", 10).status).toBe("watching")
    expect(WATCH_BEFORE_MS).toBe(3 * 60 * 60_000)
    expect(WATCH_AFTER_MS).toBe(5 * 60_000)
  })

  test("reads the delay and cancellation at the boarding station", () => {
    const late = deriveGuardState(guard, [run], lookupWith(7), true, ts("08:00"))
    expect(late).toMatchObject({
      status: "watching",
      serviceDate: DATE,
      delayMin: 7,
      cancelled: false,
      scheduledDepTs: ts("08:30"),
    })
    const cancelled = deriveGuardState(guard, [run], lookupWith(0, { trainCancelled: true }), true, ts("08:00"))
    expect(cancelled).toMatchObject({ status: "watching", cancelled: true })
  })

  test("picks the run whose window is open when yesterday's is still around, and ignores runs not calling at the station", () => {
    const yesterday = trip(
      230,
      [
        [3500, "23:50"],
        [5900, "25:10"],
      ],
      "2026-09-09",
    )
    const elsewhere = trip(230, [
      [3700, "08:40"],
      [5900, "09:50"],
    ])
    const afterMidnight = deriveGuardState(guard, [yesterday, run], lookupWith(0), true, ts("23:55", "2026-09-09"))
    expect(afterMidnight).toMatchObject({ status: "watching", serviceDate: "2026-09-09" })
    expect(deriveGuardState(guard, [elsewhere], lookupWith(0), true, ts("08:00")).status).toBe("outsideWindow")
  })
})

const watching = (delayMin: number, cancelled = false, live = true) =>
  ({ status: "watching", serviceDate: DATE, scheduledDepTs: ts("08:30"), delayMin, cancelled, live }) as const

const walk = (steps: [Parameters<typeof decideGuard>[1], number][]) => {
  let memory: GuardMemory | undefined
  const pushes: string[] = []
  for (const [state, at] of steps) {
    const decision = decideGuard(memory, state, guard, at)
    memory = decision.memory
    if (decision.push) pushes.push(`${decision.push.kind}:${decision.push.delayMin}@${at}`)
  }
  return { pushes, memory }
}

describe("whether to tell the rider", () => {
  test("a delay at the threshold is told once it has held for a cycle, and not again while it stays", () => {
    const { pushes } = walk([
      [watching(2), 0],
      [watching(3), 60_000],
      [watching(3), 60_000 + CONFIRM_MS],
      [watching(4), 60_000 + CONFIRM_MS + 60_000],
      [watching(3), 60_000 + CONFIRM_MS + 120_000],
    ])
    expect(pushes).toEqual([`delayed:3@${60_000 + CONFIRM_MS}`])
  })

  test("a delay that does not hold, or below the threshold, or from a stale feed, is not told", () => {
    expect(
      walk([
        [watching(5), 0],
        [watching(1), 30_000],
        [watching(1), 30_000 + CONFIRM_MS],
      ]).pushes,
    ).toEqual([])
    expect(
      walk([
        [watching(2), 0],
        [watching(2), CONFIRM_MS],
      ]).pushes,
    ).toEqual([])
    expect(
      walk([
        [watching(9, false, false), 0],
        [watching(9, false, false), CONFIRM_MS],
      ]).pushes,
    ).toEqual([])
  })

  test("a delay that keeps growing is told again every few minutes more, a few times at most", () => {
    const steps: [ReturnType<typeof watching>, number][] = []
    let at = 0
    for (const delay of [3, 3, 5, 5, 8, 8, 13, 13, 18, 18, 30, 30]) {
      steps.push([watching(delay), at])
      at += CONFIRM_MS
    }
    const { pushes } = walk(steps)
    expect(pushes).toEqual([`delayed:3@${CONFIRM_MS}`, `delayed:8@${5 * CONFIRM_MS}`, `delayed:13@${7 * CONFIRM_MS}`])
    expect(pushes.length).toBe(MAX_DELAY_PUSHES)
    expect(REGROWTH_MIN).toBe(5)
  })

  test("a cancellation is told at once, once", () => {
    const { pushes } = walk([
      [watching(0, true), 0],
      [watching(0, true), 60_000],
    ])
    expect(pushes).toEqual(["cancelled:0@0"])
  })

  test("a new day starts afresh; outside the window nothing changes", () => {
    const { pushes, memory } = walk([
      [watching(4), 0],
      [watching(4), CONFIRM_MS],
      [{ status: "outsideWindow" }, 2 * CONFIRM_MS],
      [{ ...watching(4), serviceDate: "2026-09-11" }, 3 * CONFIRM_MS],
      [{ ...watching(4), serviceDate: "2026-09-11" }, 4 * CONFIRM_MS],
    ])
    expect(pushes).toEqual([`delayed:4@${CONFIRM_MS}`, `delayed:4@${4 * CONFIRM_MS}`])
    expect(memory?.serviceDate).toBe("2026-09-11")
  })
})

describe("the words", () => {
  test("say the train, how late, the new time and that it can shrink", () => {
    const msg = guardMessage({ kind: "delayed", delayMin: 6 }, watching(6), guard, "en")
    expect(msg.title).toBe("Train 230 at 08:30 from Herzliya to Ashkelon")
    expect(msg.body).toBe("Running 6 min late, now expected at 08:36. Delays can shrink – keep an eye on it.")
    expect(guardMessage({ kind: "cancelled", delayMin: 0 }, watching(0, true), guard, "he").body).toBe("בוטלה. בדקו מסלול חלופי.")
  })
})
