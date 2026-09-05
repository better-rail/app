import { completeJourney, planTravels, CONNECTION_LIMITS } from "../requests/gtfs-route-api"
import type { ConnectionLimits, DayTrips, Leg, StopNode, TripData } from "../requests/gtfs-route-api"
import { toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-06-27"
const ts = (clock: string) =>
  toEpochMs(
    DATE,
    clock.split(":").reduce((acc, v, i) => acc + Number(v) * [3600, 60][i], 0),
  )
const trip = (tripId: string, trainNumber: number, stops: [number, string, number][]): TripData => ({
  tripKey: `${DATE}#${tripId}`,
  trainNumber,
  stops: stops.map(([railId, clock, platform]): StopNode => ({ railId, platform, arrTs: ts(clock), depTs: ts(clock) })),
})
const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

// The moment a rider can be on the platform for a call. Outside Savidor a stop's
// departure is padding rather than a time anything happens at, so the connection
// is measured to its arrival. The generated timetables below give some stops a
// five-minute dwell precisely so the two differ.
const boardableTs = (s: StopNode): number => (s.railId === 3700 ? s.depTs : s.arrTs)

/**
 * The search as it stood before the station index: every trip in the table
 * scanned on every round, boarding at its first stop inside the window. The
 * indexed search must give exactly this answer, tie-breaks included.
 */
const referenceCompleteJourney = (
  allTrips: DayTrips,
  firstTrip: TripData,
  boardIndex: number,
  target: number,
  limits: ConnectionLimits,
  maxRounds = 3,
): Leg[] | null => {
  const source = firstTrip.stops[boardIndex].railId
  type Label = { arr: number; leg: Leg }
  const rounds: Map<number, Label>[] = []
  const first = new Map<number, Label>()
  for (let j = boardIndex + 1; j < firstTrip.stops.length; j++) {
    const s = firstTrip.stops[j]
    const cur = first.get(s.railId)
    if (!cur || s.arrTs < cur.arr) {
      first.set(s.railId, { arr: s.arrTs, leg: { tripKey: firstTrip.tripKey, boardIndex, alightIndex: j } })
    }
  }
  rounds.push(first)
  for (let round = 1; round <= maxRounds; round++) {
    const previous = rounds[round - 1]
    if (previous.size === 0) break
    const current = new Map<number, Label>()
    for (const t of allTrips.values()) {
      if (t.tripKey === firstTrip.tripKey) continue
      let bIdx = -1
      for (let i = 0; i < t.stops.length - 1; i++) {
        const stop = t.stops[i]
        const ready = previous.get(stop.railId)
        if (ready === undefined) continue
        const off = allTrips.get(ready.leg.tripKey)!.stops[ready.leg.alightIndex]
        const wait = boardableTs(stop) - ready.arr
        // Savidor's platforms are island pairs (1-2, 3-4, 5-6), so the two halves
        // of one count as the same face there.
        const stayingPut =
          off.platform > 0 &&
          stop.platform > 0 &&
          (off.platform === stop.platform ||
            (off.railId === 3700 && Math.ceil(off.platform / 2) === Math.ceil(stop.platform / 2)))
        if (wait >= limits.minAt(stop.railId, stayingPut) && wait <= limits.maxMs) {
          bIdx = i
          break
        }
      }
      if (bIdx < 0) continue
      for (let j = bIdx + 1; j < t.stops.length; j++) {
        const s = t.stops[j]
        const existing = current.get(s.railId)
        if (!existing || s.arrTs < existing.arr) {
          current.set(s.railId, { arr: s.arrTs, leg: { tripKey: t.tripKey, boardIndex: bIdx, alightIndex: j } })
        }
      }
    }
    if (current.size === 0) break
    rounds.push(current)
  }
  let bestRound = -1
  let bestArr = Infinity
  for (let r = 0; r < rounds.length; r++) {
    const label = rounds[r].get(target)
    if (label && label.arr < bestArr) {
      bestArr = label.arr
      bestRound = r
    }
  }
  if (bestRound < 0) return null
  const legs: Leg[] = []
  let station = target
  for (let r = bestRound; r >= 0; r--) {
    const label = rounds[r].get(station)
    if (!label) return null
    legs.unshift(label.leg)
    station = allTrips.get(label.leg.tripKey)!.stops[label.leg.boardIndex].railId
  }
  return station === source ? legs : null
}

// Small deterministic PRNG so a failure reproduces.
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const STATIONS = [3700, 3500, 3400, 3300, 3100, 2800, 2100, 5000]

// Times snap to a five-minute grid so trips collide constantly: the same
// departure at a station, the same arrival at another. Ties are the whole point.
// A one-minute offset is sprinkled in so the four- and five-minute floors are
// actually told apart, and platforms vary (0 among them) so the same-platform
// floor is exercised rather than assumed.
const randomTable = (seed: number): DayTrips => {
  const rand = rng(seed)
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]
  const trips: TripData[] = []
  const count = 10 + Math.floor(rand() * 30)
  for (let n = 0; n < count; n++) {
    const stops: StopNode[] = []
    const visited = new Set<number>()
    let clock = 5 * 60 + 5 * Math.floor(rand() * 200) // minutes since midnight, 05:00 .. 21:35
    const hops = 2 + Math.floor(rand() * 5)
    for (let h = 0; h < hops; h++) {
      let station = pick(STATIONS)
      // Occasionally revisit a station, so loops and double calls are covered too.
      if (visited.has(station) && rand() < 0.8) continue
      visited.add(station)
      const dwell = rand() < 0.3 ? 5 : 0
      stops.push({
        railId: station,
        platform: Math.floor(rand() * 4),
        arrTs: toEpochMs(DATE, clock * 60),
        depTs: toEpochMs(DATE, (clock + dwell) * 60),
      })
      clock += dwell + 5 * (1 + Math.floor(rand() * 8)) - (rand() < 0.25 ? 1 : 0)
    }
    if (stops.length < 2) continue
    trips.push({ tripKey: `${DATE}#t${n}`, trainNumber: 100 + n, stops })
  }
  return table(...trips)
}

describe("search core (station index)", () => {
  it("matches the reference scan on random timetables, tie-breaks included", () => {
    let compared = 0
    let found = 0
    for (let seed = 1; seed <= 300; seed++) {
      const trips = randomTable(seed)
      for (const first of trips.values()) {
        for (const boardIndex of [0, 1]) {
          if (boardIndex >= first.stops.length - 1) continue
          for (const target of STATIONS) {
            if (target === first.stops[boardIndex].railId) continue
            for (const limits of [CONNECTION_LIMITS]) {
              const expected = referenceCompleteJourney(trips, first, boardIndex, target, limits)
              const actual = completeJourney(trips, first, boardIndex, target, limits)
              expect(actual).toEqual(expected)
              compared++
              if (expected) found++
            }
          }
        }
      }
    }
    // Sanity: the comparison actually exercised connections, not just misses.
    expect(compared).toBeGreaterThan(50_000)
    expect(found).toBeGreaterThan(5_000)
  })

  it("boards a trip at its first call at the origin inside the window, not an earlier one outside it", () => {
    // A loop: calls at Savidor at 07:00 (before the query) and again at 08:10.
    const loop = trip("loop", 100, [
      [3700, "07:00", 1],
      [3500, "07:20", 1],
      [3700, "08:10", 1],
      [3400, "08:30", 1],
    ])
    const travels = planTravels(table(loop), 3700, 3400, ts("08:00"))
    expect(travels).toHaveLength(1)
    expect(travels[0].departureTime).toBe("2026-06-27T08:10:00")
    expect(travels[0].trains[0].stopStations).toHaveLength(0)
  })

  it("keeps trips that leave at the same moment in the table's order", () => {
    const a = trip("a", 101, [
      [3700, "08:00", 1],
      [3400, "08:30", 1],
    ])
    const b = trip("b", 102, [
      [3700, "08:00", 2],
      [3400, "08:30", 2],
    ])
    const numbers = (trips: DayTrips) => planTravels(trips, 3700, 3400, ts("07:00")).map((t) => t.trains[0].trainNumber)
    expect(numbers(table(a, b))).toEqual([101, 102])
    expect(numbers(table(b, a))).toEqual([102, 101])
  })

  it("re-indexes a table that has grown since it was last searched", () => {
    const trips = table(
      trip("a", 101, [
        [3700, "08:00", 1],
        [3400, "08:30", 1],
      ]),
    )
    expect(planTravels(trips, 3700, 3400, ts("07:00"))).toHaveLength(1)
    const later = trip("b", 102, [
      [3700, "09:00", 1],
      [3400, "09:30", 1],
    ])
    trips.set(later.tripKey, later)
    expect(planTravels(trips, 3700, 3400, ts("07:00")).map((t) => t.trains[0].trainNumber)).toEqual([101, 102])
  })
})
