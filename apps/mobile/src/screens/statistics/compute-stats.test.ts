import { describe, expect, test } from "bun:test"
import type { RideRecord } from "@/models/ride-history/ride-history"
import {
  availableYears,
  computeAchievements,
  computeUsualTrainDetails,
  computeYearStats,
  metricChart,
  metricValue,
  nextAchievement,
  rideHistoryItems,
  ridesInPeriod,
  weekDelays,
} from "./compute-stats"

let counter = 0
function ride(overrides: Partial<RideRecord> & { departureTime: number }): RideRecord {
  counter += 1
  return {
    id: `ride-${counter}`,
    originId: "3700",
    destinationId: "680",
    arrivalTime: overrides.departureTime + 60 * 60000,
    trainNumbers: [100],
    delay: 0,
    distanceKm: 50,
    stationIds: ["3700", "680"],
    ...overrides,
  }
}

const at = (month: number, day: number, hour = 7, minute = 40) => new Date(2026, month - 1, day, hour, minute).getTime()

describe("computeYearStats", () => {
  test("sums rides, stations and time for the year only", () => {
    const rides = [
      ride({ departureTime: at(1, 5) }),
      ride({ departureTime: at(3, 5), destinationId: "4600" }),
      ride({ departureTime: new Date(2025, 11, 30).getTime() }),
    ]
    const stats = computeYearStats(rides, 2026)
    expect(stats.rideCount).toBe(2)
    expect(stats.stationCount).toBe(3)
    expect(stats.minutesOnTrain).toBe(120)
  })

  test("top station counts both ends of a trip", () => {
    const rides = [
      ride({ departureTime: at(1, 5), originId: "3700", destinationId: "680" }),
      ride({ departureTime: at(1, 6), originId: "680", destinationId: "3700" }),
      ride({ departureTime: at(1, 7), originId: "3700", destinationId: "4600" }),
    ]
    expect(computeYearStats(rides, 2026).topStation).toEqual({ id: "3700", visits: 3 })
  })

  test("on-time share treats under five minutes as on time", () => {
    const rides = [
      ride({ departureTime: at(1, 5), delay: 0 }),
      ride({ departureTime: at(1, 6), delay: 4 }),
      ride({ departureTime: at(1, 7), delay: 12 }),
      ride({ departureTime: at(1, 8), delay: 5 }),
    ]
    expect(computeYearStats(rides, 2026).onTime).toEqual({ percent: 50, averageDelayMinutes: 5 })
    expect(computeYearStats([], 2026).onTime).toBeUndefined()
  })

  test("usual train is the most repeated trip at the same time", () => {
    const rides = [
      ride({ departureTime: at(1, 5, 7, 40) }),
      ride({ departureTime: at(1, 6, 7, 40) }),
      ride({ departureTime: at(1, 7, 8, 10) }),
      ride({ departureTime: at(1, 7, 17, 30), originId: "680", destinationId: "3700" }),
    ]
    const usual = computeYearStats(rides, 2026).usualTrain
    expect(usual).toMatchObject({ originId: "3700", destinationId: "680", count: 2 })
    expect(new Date(usual!.departureTime).getHours()).toBe(7)
  })

  test("a trip taken once is not a usual train", () => {
    expect(computeYearStats([ride({ departureTime: at(1, 5) })], 2026).usualTrain).toBeUndefined()
  })
})

describe("availableYears", () => {
  test("lists ride years newest first and always the current year", () => {
    const rides = [ride({ departureTime: new Date(2024, 5, 1).getTime() })]
    expect(availableYears(rides, new Date(2026, 0, 1))).toEqual([2026, 2024])
  })
})

describe("achievements", () => {
  test("next achievement is the closest incomplete badge", () => {
    const rides = Array.from({ length: 8 }, (_, i) => ride({ departureTime: at(1, i + 1) }))
    const next = nextAchievement(computeAchievements(rides))
    // 8/10 rides beats 2/5 stations
    expect(next).toMatchObject({ kind: "rides", target: 10, value: 8, completed: false })
  })

  test("completed tiers are skipped", () => {
    const rides = Array.from({ length: 12 }, (_, i) => ride({ departureTime: at(1, i + 1) }))
    const achievements = computeAchievements(rides)
    expect(achievements.find((a) => a.kind === "rides" && a.target === 10)?.completed).toBe(true)
    // 2/5 stations is closer than 12/50 rides
    expect(nextAchievement(achievements)).toMatchObject({ kind: "stations", target: 5 })
  })
})

describe("computeUsualTrainDetails", () => {
  const trip = { originId: "3700", destinationId: "680", departureTime: at(1, 5, 7, 40) }

  test("summarises the recent rides of one departure", () => {
    const rides = [
      ride({ departureTime: at(1, 5, 7, 40), delay: 0 }),
      ride({ departureTime: at(1, 6, 7, 40), delay: 7 }),
      ride({ departureTime: at(1, 7, 7, 40), delay: 2 }),
      ride({ departureTime: at(1, 7, 8, 10), delay: 30 }),
      ride({ departureTime: at(1, 8, 7, 40), originId: "680", destinationId: "3700", delay: 30 }),
    ]
    const details = computeUsualTrainDetails(rides, trip)
    expect(details.rideCount).toBe(3)
    expect(details.recentDelays).toEqual([2, 7, 0])
    expect(details.recentOnTimeCount).toBe(2)
    expect(details.averageDelayMinutes).toBe(3)
    expect(details.averageDurationMinutes).toBe(60)
    expect(details.betterTrain).toBeUndefined()
  })

  test("suggests the nearest departure that runs closer to schedule", () => {
    const rides = [
      ride({ departureTime: at(1, 5, 7, 40), delay: 4 }),
      ride({ departureTime: at(1, 6, 7, 40), delay: 4 }),
      ride({ departureTime: at(1, 7, 7, 52), delay: 1 }),
      ride({ departureTime: at(1, 8, 7, 52), delay: 1 }),
      ride({ departureTime: at(1, 9, 9, 0), delay: 0 }),
      ride({ departureTime: at(1, 10, 9, 0), delay: 0 }),
      ride({ departureTime: at(1, 11, 7, 30), delay: 0 }),
    ]
    const better = computeUsualTrainDetails(rides, trip).betterTrain
    expect(better?.minutesLessLate).toBe(3)
    expect(new Date(better!.departureTime).getMinutes()).toBe(52)
  })
})

describe("metricValue", () => {
  const rides = [ride({ departureTime: at(1, 5), delay: 2 }), ride({ departureTime: at(1, 6), delay: 9 })]

  test("sums each metric", () => {
    expect(metricValue(rides, "rides")).toBe(2)
    expect(metricValue(rides, "hours")).toBe(2)
    expect(metricValue(rides, "onTime")).toBe(50)
  })

  test("has no on-time percent without rides", () => {
    expect(metricValue([], "onTime")).toBeUndefined()
  })
})

describe("rideHistoryItems", () => {
  test("sorts rides newest first under a heading per day", () => {
    const morning = ride({ departureTime: at(10, 5, 7) })
    const evening = ride({ departureTime: at(10, 5, 18) })
    const earlier = ride({ departureTime: at(10, 1) })
    const items = rideHistoryItems([morning, earlier, evening])
    expect(items.map((item) => (item.type === "day" ? item.date : item.ride.id))).toEqual([
      at(10, 5, 0, 0),
      evening.id,
      morning.id,
      at(10, 1, 0, 0),
      earlier.id,
    ])
    expect(items.filter((item) => item.type === "ride").map((item) => item.firstOfDay)).toEqual([true, false, true])
  })
})

describe("weekDelays", () => {
  test("sums this week's delays per day and last week's total", () => {
    // Oct 10 2026 is a Saturday, so this week started Sunday Oct 4
    const rides = [
      ride({ departureTime: at(10, 4), delay: 3 }),
      ride({ departureTime: at(10, 6), delay: 7 }),
      ride({ departureTime: at(10, 6, 18), delay: 2 }),
      ride({ departureTime: at(10, 3), delay: 10 }),
      ride({ departureTime: at(9, 20), delay: 30 }),
    ]
    const delays = weekDelays(rides, new Date(2026, 9, 10, 12))
    expect(delays.byDay).toEqual([3, 0, 9, 0, 0, 0, 0])
    expect(delays.total).toBe(12)
    expect(delays.lastWeekTotal).toBe(10)
    expect(delays.today).toBe(6)
    expect(delays.rideCount).toBe(3)
    expect(delays.delayedRides.map((ride) => ride.delay)).toEqual([2, 7, 3])
  })
})

describe("ridesInPeriod", () => {
  const now = new Date(2026, 9, 10, 12) // Saturday
  const rides = [
    ride({ departureTime: at(10, 4) }),
    ride({ departureTime: at(10, 2) }),
    ride({ departureTime: at(3, 1) }),
    ride({ departureTime: new Date(2025, 11, 30).getTime() }),
  ]
  const count = (period: Parameters<typeof ridesInPeriod>[1]) => ridesInPeriod(rides, period, now).length

  test("keeps rides since the start of the week, month or year", () => {
    expect(count("week")).toBe(1)
    expect(count("month")).toBe(2)
    expect(count("year")).toBe(3)
    expect(count("all")).toBe(4)
  })
})

describe("metricChart", () => {
  const now = new Date(2026, 9, 15, 12) // Thursday, 15 Oct 2026

  test("buckets this week by day, marking today and the days ahead", () => {
    const rides = [
      ride({ departureTime: at(10, 11) }),
      ride({ departureTime: at(10, 15, 8) }),
      ride({ departureTime: at(10, 15, 9) }),
    ]
    const { unit, buckets } = metricChart(rides, "week", "rides", now)
    expect(unit).toBe("day")
    expect(buckets.map((bucket) => bucket.value)).toEqual([1, 0, 0, 0, 2, 0, 0])
    expect(buckets.findIndex((bucket) => bucket.current)).toBe(4)
    expect(buckets.filter((bucket) => bucket.future)).toHaveLength(2)
  })

  test("averages only the buckets since the first ride", () => {
    const rides = [ride({ departureTime: at(9, 10) }), ride({ departureTime: at(9, 11) }), ride({ departureTime: at(10, 1) })]
    const { unit, buckets, average } = metricChart(rides, "year", "rides", now)
    expect(unit).toBe("month")
    expect(buckets).toHaveLength(12)
    // September and October, not January to October
    expect(average).toBe(1.5)
  })

  test("leaves on-time empty for buckets without rides and averages over all rides", () => {
    const rides = [ride({ departureTime: at(10, 12), delay: 10 }), ride({ departureTime: at(10, 13) })]
    const { buckets, average } = metricChart(rides, "week", "onTime", now)
    expect(buckets[0].value).toBeUndefined()
    expect(buckets[1].value).toBe(0)
    expect(buckets[2].value).toBe(100)
    expect(average).toBe(50)
  })

  test("pads all time to six months, and switches to years past two", () => {
    const recent = metricChart([ride({ departureTime: at(9, 1) })], "all", "rides", now)
    expect(recent.unit).toBe("month")
    expect(recent.buckets).toHaveLength(6)
    expect(recent.average).toBe(0.5)

    const old = metricChart([ride({ departureTime: new Date(2023, 5, 1).getTime() })], "all", "rides", now)
    expect(old.unit).toBe("year")
    expect(old.buckets.map((bucket) => bucket.value)).toEqual([1, 0, 0, 0])
  })
})
