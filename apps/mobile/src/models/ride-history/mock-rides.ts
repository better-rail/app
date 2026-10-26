import { addDays, startOfDay } from "date-fns"
import { stationsPathKm } from "@/utils/helpers/station-distance"
import type { RideRecord } from "./ride-history"

/** Ids of generated rides start with this, so they're never persisted */
export const MOCK_RIDE_PREFIX = "mock-"

type Trip = { stationIds: string[]; trainNumber: number; minutes: number }

const TLV_JERUSALEM = ["3700", "4600", "4900", "8600", "680"]
const TLV_HAIFA = ["4600", "3700", "3600", "3500", "3300", "3100", "2800", "2300", "2200", "2100"]
const TLV_BEER_SHEVA = ["3700", "4600", "4900", "5000", "5200", "7000", "7320"]
const TLV_MODIIN = ["3700", "4600", "4900", "8600", "300", "400"]

const reversed = (ids: string[]) => [...ids].reverse()

// A mulberry32 generator, so the mock history is the same on every launch
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ (t + Math.imul(t ^ (t >>> 14), 71 | t))
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** About a year and a half of commuting between Tel Aviv and Jerusalem, with weekend trips around the country */
export function mockRides(now = new Date()): RideRecord[] {
  const rand = random(42)
  const chance = (p: number) => rand() < p
  const delay = (lateChance: number) => (chance(lateChance) ? Math.round(2 + rand() * 14) : 0)
  const rides: RideRecord[] = []

  const add = (day: Date, hour: number, minute: number, trip: Trip, lateChance: number) => {
    const departureTime = new Date(day).setHours(hour, minute, 0, 0)
    if (departureTime > now.getTime()) return
    rides.push({
      id: `${MOCK_RIDE_PREFIX}${rides.length}`,
      originId: trip.stationIds[0],
      destinationId: trip.stationIds[trip.stationIds.length - 1],
      departureTime,
      arrivalTime: departureTime + trip.minutes * 60000,
      trainNumbers: [trip.trainNumber],
      delay: delay(lateChance),
      distanceKm: stationsPathKm(trip.stationIds),
      stationIds: trip.stationIds,
    })
  }

  const today = startOfDay(now)
  for (let day = addDays(today, -540); day <= today; day = addDays(day, 1)) {
    const weekday = day.getDay()
    const isWorkday = weekday <= 4

    if (isWorkday && chance(0.75)) {
      // The usual 7:40 runs late often; the 7:10 is the better train
      if (chance(0.85)) add(day, 7, 40, { stationIds: TLV_JERUSALEM, trainNumber: 723, minutes: 34 }, 0.4)
      else add(day, 7, 10, { stationIds: TLV_JERUSALEM, trainNumber: 719, minutes: 33 }, 0.1)
      add(day, chance(0.7) ? 17 : 18, 25, { stationIds: reversed(TLV_JERUSALEM), trainNumber: 774, minutes: 35 }, 0.3)
    }

    if (weekday === 5 && chance(0.25)) {
      add(day, 10, 15, { stationIds: TLV_HAIFA, trainNumber: 111, minutes: 72 }, 0.35)
      add(day, 15, 5, { stationIds: reversed(TLV_HAIFA), trainNumber: 148, minutes: 74 }, 0.25)
    }

    if (weekday === 6 && chance(0.15)) {
      add(day, 19, 50, { stationIds: TLV_BEER_SHEVA, trainNumber: 9505, minutes: 68 }, 0.3)
    }

    if (isWorkday && chance(0.05)) {
      add(day, 20, 0, { stationIds: TLV_MODIIN, trainNumber: 1631, minutes: 31 }, 0.2)
    }
  }

  return rides
}
