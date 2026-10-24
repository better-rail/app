/**
 * helpers.ts — a tiny rail feed for the Workers tests, and the clock to go with it.
 *
 * One train (100) from Tel Aviv Savidor (3700) to Herzliya (3500), placed on
 * today's Israel service date at the minute offsets the test asks for, so a
 * ride can be started "now" against the production-mode window checks.
 */
import { env } from "cloudflare:test"

import { applySchema } from "../../src/db"
import { loadFeed } from "../../src/ingest/load"
import type { RailFeedPayload } from "../../src/ingest/payload"
import { israelWallClockMs } from "../../src/utils/israel-time"
import { addDays } from "../../src/utils/gtfs-time"

export const AUTH = { authorization: "Bearer test-ingest-token" }

/** Today's Israel service date and the seconds since its midnight, for a real instant. */
export const israelServiceClock = (realMs = Date.now()) => {
  const wall = israelWallClockMs(realMs)
  const serviceDate = new Date(wall).toISOString().slice(0, 10)
  const offsetSec = Math.floor((wall - Date.parse(`${serviceDate}T00:00:00Z`)) / 1000)
  return { serviceDate, offsetSec }
}

export type FeedOptions = {
  /** Train 100's departure from 3700, in seconds from the service day's midnight. */
  departureOffsetSec: number
  /** Ride length in seconds (default 20 minutes). */
  durationSec?: number
  serviceDate?: string
  checksum?: string
}

export const makeFeed = (options: FeedOptions): RailFeedPayload => {
  const { serviceDate } = israelServiceClock()
  const date = options.serviceDate ?? serviceDate
  const dep = options.departureOffsetSec
  const arr = dep + (options.durationSec ?? 20 * 60)
  // The scheduled platform travels on the stop_times row (the loader's precedence
  // starts from the SIRI-learned table and ends with this GTFS platform_code).
  const stop = (stopId: string, railId: number, seq: number, arrSec: number, depSec: number, platform: string) => ({
    tripId: "T100",
    stopSequence: seq,
    stopId,
    arrOffsetSec: arrSec,
    depOffsetSec: depSec,
    railId,
    gtfsPlatformCode: platform,
  })
  return {
    checksum: options.checksum ?? "feed-" + Math.random().toString(36).slice(2),
    feedInfo: { feedStartDate: addDays(date, -1), feedEndDate: addDays(date, 9), feedVersion: "test" },
    stops: [
      {
        stopId: "N3700",
        stopCode: "17000",
        stopName: "תל אביב - סבידור מרכז",
        lat: 32.083715,
        lon: 34.798247,
        locationType: 1,
        parentStation: null,
        platformCode: null,
      },
      {
        stopId: "P3700",
        stopCode: "17001",
        stopName: "תל אביב - סבידור מרכז",
        lat: 32.083715,
        lon: 34.798247,
        locationType: 0,
        parentStation: "N3700",
        platformCode: "3",
      },
      {
        stopId: "N3500",
        stopCode: "17100",
        stopName: "הרצליה",
        lat: 32.163558,
        lon: 34.817406,
        locationType: 1,
        parentStation: null,
        platformCode: null,
      },
      {
        stopId: "P3500",
        stopCode: "17101",
        stopName: "הרצליה",
        lat: 32.163558,
        lon: 34.817406,
        locationType: 0,
        parentStation: "N3500",
        platformCode: "1",
      },
    ],
    stationMap: [
      { gtfsStationId: "N3700", railId: 3700, stopCode: "17000" },
      { gtfsStationId: "N3500", railId: 3500, stopCode: "17100" },
    ],
    routes: [{ routeId: "R1", routeLongName: "תל אביב - הרצליה" }],
    trips: [{ tripId: "T100", routeId: "R1", serviceId: "S1", trainNumber: 100 }],
    calendarDates: [{ serviceId: "S1", serviceDate: date }],
    stopTimes: [stop("P3700", 3700, 1, dep, dep, "3"), stop("P3500", 3500, 2, arr, arr + 60, "1")],
    warnings: [],
  }
}

const silent = () => undefined

/** Wipe D1 and load `feed` as the active feed. */
export const seedFeed = async (feed: RailFeedPayload) => {
  await applySchema(env.DB)
  for (const table of ["stop_times", "calendar_dates", "trips", "routes", "station_map", "stops", "feeds", "train_platforms"]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run()
  }
  return loadFeed(env.DB, feed, silent)
}

/** The naive "YYYY-MM-DDTHH:mm:ss" the timetable prints for a service-day offset. */
export const naiveIso = (serviceDate: string, offsetSec: number) =>
  new Date(Date.parse(`${serviceDate}T00:00:00Z`) + offsetSec * 1000).toISOString().slice(0, 19)
