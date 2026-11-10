import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarMonths,
  getDay,
  getDaysInMonth,
  getYear,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns"
import type { RideRecord } from "@/models/ride-history/ride-history"

/** Israel Railways counts a train as on time up to this many minutes late */
export const ON_TIME_THRESHOLD_MINUTES = 5

export type AchievementKind = "stations" | "rides"

export type Achievement = {
  kind: AchievementKind
  /** Tier index, so the copy can name the badge */
  tier: number
  target: number
  value: number
  completed: boolean
}

export type RideStats = {
  rideCount: number
  stationCount: number
  minutesOnTrain: number
  topStation?: { id: string; visits: number }
  onTime?: { percent: number; averageDelayMinutes: number }
  usualTrain?: { originId: string; destinationId: string; departureTime: number; count: number }
}

export type YearStats = RideStats & { year: number }

const ACHIEVEMENT_TIERS: Record<AchievementKind, number[]> = {
  stations: [5, 10, 20, 35, 50],
  rides: [10, 50, 100, 250, 500, 1000],
}

export function ridesInYear(rides: RideRecord[], year: number) {
  return rides.filter((ride) => getYear(ride.departureTime) === year)
}

/** Years with rides, newest first, always including the current one */
export function availableYears(rides: RideRecord[], now = new Date()) {
  const years = new Set(rides.map((ride) => getYear(ride.departureTime)))
  years.add(getYear(now))
  return [...years].sort((a, b) => b - a)
}

function stationCount(rides: RideRecord[]) {
  return new Set(rides.flatMap((ride) => [ride.originId, ride.destinationId])).size
}

function topStation(rides: RideRecord[]) {
  const visits = new Map<string, number>()
  for (const ride of rides) {
    visits.set(ride.originId, (visits.get(ride.originId) ?? 0) + 1)
    visits.set(ride.destinationId, (visits.get(ride.destinationId) ?? 0) + 1)
  }
  let best: { id: string; visits: number } | undefined
  for (const [id, count] of visits) {
    if (!best || count > best.visits) best = { id, visits: count }
  }
  return best
}

function onTime(rides: RideRecord[]) {
  if (rides.length === 0) return undefined
  const delays = rides.map((ride) => Math.max(0, ride.delay ?? 0))
  const onTimeCount = delays.filter((delay) => delay < ON_TIME_THRESHOLD_MINUTES).length
  const total = delays.reduce((sum, delay) => sum + delay, 0)
  return {
    percent: Math.round((onTimeCount / rides.length) * 100),
    averageDelayMinutes: Math.round(total / rides.length),
  }
}

/** The same trip at the same scheduled time, taken more than once */
function usualTrain(rides: RideRecord[]) {
  const groups = new Map<string, { originId: string; destinationId: string; departureTime: number; count: number }>()
  for (const ride of rides) {
    const date = new Date(ride.departureTime)
    const key = `${ride.originId}-${ride.destinationId}-${date.getHours()}:${date.getMinutes()}`
    const group = groups.get(key)
    if (group) {
      group.count += 1
    } else {
      groups.set(key, {
        originId: ride.originId,
        destinationId: ride.destinationId,
        departureTime: ride.departureTime,
        count: 1,
      })
    }
  }
  let best: ReturnType<typeof groups.get>
  for (const group of groups.values()) {
    if (!best || group.count > best.count) best = group
  }
  return best && best.count >= 2 ? best : undefined
}

export function computeStats(rides: RideRecord[]): RideStats {
  return {
    rideCount: rides.length,
    stationCount: stationCount(rides),
    minutesOnTrain: rides.reduce((sum, ride) => sum + Math.max(0, ride.arrivalTime - ride.departureTime) / 60000, 0),
    topStation: topStation(rides),
    onTime: onTime(rides),
    usualTrain: usualTrain(rides),
  }
}

export function computeYearStats(rides: RideRecord[], year: number): YearStats {
  return { year, ...computeStats(ridesInYear(rides, year)) }
}

/** Lifetime badges, so a new year doesn't reset the rider's progress */
export function computeAchievements(rides: RideRecord[]): Achievement[] {
  const values: Record<AchievementKind, number> = {
    stations: stationCount(rides),
    rides: rides.length,
  }

  const achievements: Achievement[] = []
  for (const kind of Object.keys(ACHIEVEMENT_TIERS) as AchievementKind[]) {
    ACHIEVEMENT_TIERS[kind].forEach((target, tier) => {
      const value = values[kind]
      achievements.push({ kind, tier, target, value, completed: value >= target })
    })
  }
  return achievements
}

/** The closest badge still to be earned, one per kind */
export function nextAchievement(achievements: Achievement[]) {
  const candidates = new Map<AchievementKind, Achievement>()
  for (const achievement of achievements) {
    if (!achievement.completed && !candidates.has(achievement.kind)) candidates.set(achievement.kind, achievement)
  }
  let best: Achievement | undefined
  for (const candidate of candidates.values()) {
    if (!best || candidate.value / candidate.target > best.value / best.target) best = candidate
  }
  return best
}

export type UsualTrainDetails = {
  rideCount: number
  /** Delay of the latest rides, newest first */
  recentDelays: number[]
  recentOnTimeCount: number
  averageDelayMinutes: number
  averageDurationMinutes: number
  /** A nearby departure on the same trip that runs closer to schedule */
  betterTrain?: { departureTime: number; minutesLessLate: number }
}

export const RECENT_RIDES_WINDOW = 20

const clockMinutes = (time: number) => {
  const date = new Date(time)
  return date.getHours() * 60 + date.getMinutes()
}

const averageDelay = (rides: RideRecord[]) => rides.reduce((sum, ride) => sum + Math.max(0, ride.delay ?? 0), 0) / rides.length

export function computeUsualTrainDetails(
  rides: RideRecord[],
  trip: { originId: string; destinationId: string; departureTime: number },
): UsualTrainDetails {
  const tripRides = rides.filter((ride) => ride.originId === trip.originId && ride.destinationId === trip.destinationId)
  const clock = clockMinutes(trip.departureTime)
  const trainRides = tripRides.filter((ride) => clockMinutes(ride.departureTime) === clock)
  const recent = [...trainRides].sort((a, b) => b.departureTime - a.departureTime).slice(0, RECENT_RIDES_WINDOW)
  const recentDelays = recent.map((ride) => Math.max(0, ride.delay ?? 0))
  const thisDelay = trainRides.length ? averageDelay(trainRides) : 0

  // Other departures of the same trip, taken more than once, that are at least a minute better on average
  const alternatives = new Map<number, RideRecord[]>()
  for (const ride of tripRides) {
    const key = clockMinutes(ride.departureTime)
    if (key === clock) continue
    alternatives.set(key, [...(alternatives.get(key) ?? []), ride])
  }
  let betterTrain: UsualTrainDetails["betterTrain"]
  let betterDistance = Infinity
  for (const [key, group] of alternatives) {
    if (group.length < 2) continue
    const minutesLessLate = Math.round(thisDelay - averageDelay(group))
    const distance = Math.abs(key - clock)
    if (minutesLessLate >= 1 && distance < betterDistance) {
      betterDistance = distance
      betterTrain = { departureTime: group[0].departureTime, minutesLessLate }
    }
  }

  return {
    rideCount: trainRides.length,
    recentDelays,
    recentOnTimeCount: recentDelays.filter((delay) => delay < ON_TIME_THRESHOLD_MINUTES).length,
    averageDelayMinutes: Math.round(thisDelay),
    averageDurationMinutes: trainRides.length
      ? Math.round(
          trainRides.reduce((sum, ride) => sum + Math.max(0, ride.arrivalTime - ride.departureTime) / 60000, 0) /
            trainRides.length,
        )
      : 0,
    betterTrain,
  }
}

/** Rider rank by lifetime rides, 1 to 5 */
export function riderRank(rideCount: number) {
  if (rideCount >= 500) return 5
  if (rideCount >= 150) return 4
  if (rideCount >= 50) return 3
  if (rideCount >= 10) return 2
  return 1
}

export function firstRideDate(rides: RideRecord[]) {
  if (rides.length === 0) return undefined
  return rides.reduce((earliest, ride) => Math.min(earliest, ride.departureTime), Infinity)
}

export const RANK_THRESHOLDS = [0, 10, 50, 150, 500]

/** Rides still needed for the next rank, undefined at the top */
export function ridesToNextRank(rideCount: number) {
  const next = RANK_THRESHOLDS.find((threshold) => threshold > rideCount)
  return next === undefined ? undefined : next - rideCount
}

export type HistoryMetric = "rides" | "hours" | "distance" | "onTime"

/** The value of a metric over a set of rides; on-time is a percent, undefined with no rides */
export function metricValue(rides: RideRecord[], metric: HistoryMetric) {
  switch (metric) {
    case "rides":
      return rides.length
    case "hours":
      return rides.reduce((sum, ride) => sum + Math.max(0, ride.arrivalTime - ride.departureTime), 0) / 3600000
    case "distance":
      return rides.reduce((sum, ride) => sum + Math.max(0, ride.distanceKm), 0)
    case "onTime":
      return onTime(rides)?.percent
  }
}

const rideDelay = (ride: RideRecord) => Math.max(0, ride.delay ?? 0)

/** Minutes of delay this week (Sunday to Saturday), per day, against last week's total */
export function weekDelays(rides: RideRecord[], now = new Date()) {
  const thisWeek = startOfWeek(now, { weekStartsOn: 0 }).getTime()
  const lastWeek = addWeeks(thisWeek, -1).getTime()
  const byDay = Array.from({ length: 7 }, () => 0)
  const delayedRides: RideRecord[] = []
  let rideCount = 0
  let lastWeekTotal = 0
  for (const ride of rides) {
    if (ride.departureTime >= thisWeek && ride.departureTime <= now.getTime()) {
      rideCount++
      byDay[getDay(ride.departureTime)] += rideDelay(ride)
      if (rideDelay(ride) > 0) delayedRides.push(ride)
    } else if (ride.departureTime >= lastWeek && ride.departureTime < thisWeek) {
      lastWeekTotal += rideDelay(ride)
    }
  }
  delayedRides.sort((a, b) => b.departureTime - a.departureTime)
  return {
    total: byDay.reduce((sum, minutes) => sum + minutes, 0),
    byDay,
    lastWeekTotal,
    today: getDay(now),
    weekStart: thisWeek,
    rideCount,
    /** This week's rides that were late at all, newest first */
    delayedRides,
  }
}

export type HistoryPeriod = "all" | "week" | "month" | "year"

/** Rides since the start of the current week (from Sunday), month or year */
export function ridesInPeriod(rides: RideRecord[], period: HistoryPeriod, now = new Date()) {
  if (period === "all") return rides
  const start =
    period === "week" ? startOfWeek(now, { weekStartsOn: 0 }) : period === "month" ? startOfMonth(now) : startOfYear(now)
  return rides.filter((ride) => ride.departureTime >= start.getTime())
}

export type ChartUnit = "day" | "month" | "year"

export type ChartBucket = {
  start: number
  /** Undefined for on-time with no rides */
  value: number | undefined
  current: boolean
  future: boolean
}

/** All-time charts switch from months to years past this many months */
const MAX_MONTH_BUCKETS = 24
const MIN_MONTH_BUCKETS = 6

function chartStarts(rides: RideRecord[], period: HistoryPeriod, now: Date): { unit: ChartUnit; starts: Date[] } {
  const range = (count: number, at: (index: number) => Date) => Array.from({ length: count }, (_, index) => at(index))
  switch (period) {
    case "week": {
      const start = startOfWeek(now, { weekStartsOn: 0 })
      return { unit: "day", starts: range(7, (index) => addDays(start, index)) }
    }
    case "month": {
      const start = startOfMonth(now)
      return { unit: "day", starts: range(getDaysInMonth(now), (index) => addDays(start, index)) }
    }
    case "year": {
      const start = startOfYear(now)
      return { unit: "month", starts: range(12, (index) => addMonths(start, index)) }
    }
    case "all": {
      const first = firstRideDate(rides) ?? now.getTime()
      const months = differenceInCalendarMonths(now, first) + 1
      if (months > MAX_MONTH_BUCKETS) {
        const start = startOfYear(first)
        return { unit: "year", starts: range(getYear(now) - getYear(first) + 1, (index) => addYears(start, index)) }
      }
      const count = Math.max(MIN_MONTH_BUCKETS, months)
      const start = addMonths(startOfMonth(now), 1 - count)
      return { unit: "month", starts: range(count, (index) => addMonths(start, index)) }
    }
  }
}

const nextBucket = (start: Date, unit: ChartUnit) =>
  unit === "day" ? addDays(start, 1) : unit === "month" ? addMonths(start, 1) : addYears(start, 1)

/** A metric per day, month or year across the period, with the average since the first ride */
export function metricChart(rides: RideRecord[], period: HistoryPeriod, metric: HistoryMetric, now = new Date()) {
  const { unit, starts } = chartStarts(rides, period, now)
  const bounds = [...starts, nextBucket(starts[starts.length - 1], unit)].map((date) => date.getTime())
  const groups = starts.map((): RideRecord[] => [])
  for (const ride of rides) {
    const index = starts.findIndex((_, i) => ride.departureTime >= bounds[i] && ride.departureTime < bounds[i + 1])
    if (index !== -1) groups[index].push(ride)
  }

  const time = now.getTime()
  const buckets: ChartBucket[] = starts.map((_, index) => ({
    start: bounds[index],
    value: metricValue(groups[index], metric),
    current: bounds[index] <= time && time < bounds[index + 1],
    future: bounds[index] > time,
  }))

  // Buckets before the first ride or still ahead would drag the average down
  const first = firstRideDate(groups.flat()) ?? time
  const active = buckets.filter((bucket, index) => !bucket.future && bounds[index + 1] > first)
  const average =
    metric === "onTime"
      ? metricValue(groups.flat(), metric)
      : active.reduce((sum, bucket) => sum + (bucket.value ?? 0), 0) / Math.max(1, active.length)

  return { unit, buckets, average }
}

export type HistoryItem =
  | { type: "day"; key: string; date: number }
  | { type: "ride"; key: string; ride: RideRecord; firstOfDay: boolean }

/** Rides newest first, with a heading before each day */
export function rideHistoryItems(rides: RideRecord[]): HistoryItem[] {
  const sorted = [...rides].sort((a, b) => b.departureTime - a.departureTime)
  const items: HistoryItem[] = []
  let previous: number | undefined
  for (const ride of sorted) {
    const firstOfDay = previous === undefined || !isSameDay(previous, ride.departureTime)
    if (firstOfDay) {
      const date = startOfDay(ride.departureTime).getTime()
      items.push({ type: "day", key: `day-${date}`, date })
    }
    items.push({ type: "ride", key: ride.id, ride, firstOfDay })
    previous = ride.departureTime
  }
  return items
}
