/**
 * parse.ts — read the rail subset of an extracted Israel MOT GTFS feed.
 *
 * Reads .txt files with UTF-8 BOM handling (csv-parse { bom: true }), filters to
 * Israel Railways (route_type == "2"), and resolves each called platform stop to
 * its station node (parent_station, or the stop itself when standalone). The big
 * file — stop_times.txt — is streamed and kept only for rail trips.
 *
 * Times are stored as integer seconds from service-day midnight (see gtfs-time).
 */
import fs from "fs"
import path from "path"
import { parse } from "csv-parse"

import { addDays, parseOffsetSec, serviceMidnightMs } from "../utils/gtfs-time"

const RAIL_ROUTE_TYPE = "2"

export type GtfsStop = {
  stopId: string
  stopCode: string
  stopName: string
  lat: number | null
  lon: number | null
  locationType: number | null
  parentStation: string | null
  platformCode: string | null
}

export type GtfsTrip = {
  tripId: string
  routeId: string
  serviceId: string
  trainNumber: number
}

export type GtfsStopTime = {
  tripId: string
  stopSequence: number
  stopId: string
  arrOffsetSec: number
  depOffsetSec: number
}

export type GtfsCalendarDate = {
  serviceId: string
  serviceDate: string // "YYYY-MM-DD"
}

export type GtfsFeedInfo = {
  feedStartDate: string | null
  feedEndDate: string | null
  feedVersion: string | null
}

export type RailFeed = {
  feedInfo: GtfsFeedInfo
  routes: Map<string, { routeId: string; routeLongName: string }>
  trips: Map<string, GtfsTrip>
  stopTimes: GtfsStopTime[]
  stops: Map<string, GtfsStop>
  calendarDates: GtfsCalendarDate[]
  /** Station-node stop_id -> the node's stop record (parents + standalone rail stops). */
  stationNodes: Map<string, GtfsStop>
  /** Called platform stop_id -> its station-node stop_id. */
  platformToStationNode: Map<string, string>
}

const streamCsv = async (filePath: string, onRow: (row: Record<string, string>) => void) => {
  const parser = fs.createReadStream(filePath).pipe(
    parse({
      bom: true, // every MOT file is UTF-8 with a BOM
      columns: true,
      skip_empty_lines: true,
      // The MOT feed leaves ASCII double-quotes unescaped inside fields (Hebrew
      // gershayim, e.g. ת"א), which strict CSV parsing rejects. Tolerate quotes
      // that appear mid-field and rows with an unexpected column count.
      relax_quotes: true,
      relax_column_count: true,
    }),
  )
  for await (const row of parser) {
    onRow(row as Record<string, string>)
  }
}

const toNum = (value: string | undefined): number | null => {
  if (value === undefined || value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const gtfsDate = (value: string | undefined): string | null => {
  // GTFS dates are YYYYMMDD.
  if (!value || value.length !== 8) return null
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
}

export async function parseRailFeed(dir: string): Promise<RailFeed> {
  const file = (name: string) => path.join(dir, name)

  // 1. routes.txt -> rail routes
  const railRouteIds = new Set<string>()
  const routes = new Map<string, { routeId: string; routeLongName: string }>()
  await streamCsv(file("routes.txt"), (row) => {
    if (row.route_type === RAIL_ROUTE_TYPE) {
      railRouteIds.add(row.route_id)
      routes.set(row.route_id, { routeId: row.route_id, routeLongName: row.route_long_name ?? "" })
    }
  })

  // 2. trips.txt -> rail trips (trip_headsign holds the train number for rail)
  const trips = new Map<string, GtfsTrip>()
  const railServiceIds = new Set<string>()
  await streamCsv(file("trips.txt"), (row) => {
    if (!railRouteIds.has(row.route_id)) return
    const trainNumber = parseInt(row.trip_headsign, 10)
    trips.set(row.trip_id, {
      tripId: row.trip_id,
      routeId: row.route_id,
      serviceId: row.service_id,
      trainNumber: Number.isFinite(trainNumber) ? trainNumber : 0,
    })
    railServiceIds.add(row.service_id)
  })

  // 3. stop_times.txt (big) -> keep only rail trips
  const stopTimes: GtfsStopTime[] = []
  const calledStopIds = new Set<string>()
  await streamCsv(file("stop_times.txt"), (row) => {
    if (!trips.has(row.trip_id)) return
    calledStopIds.add(row.stop_id)
    stopTimes.push({
      tripId: row.trip_id,
      stopSequence: parseInt(row.stop_sequence, 10),
      stopId: row.stop_id,
      arrOffsetSec: parseOffsetSec(row.arrival_time),
      depOffsetSec: parseOffsetSec(row.departure_time),
    })
  })

  // 4. stops.txt -> all stops (needed for parent resolution + names/coords)
  const stops = new Map<string, GtfsStop>()
  await streamCsv(file("stops.txt"), (row) => {
    stops.set(row.stop_id, {
      stopId: row.stop_id,
      stopCode: row.stop_code ?? "",
      stopName: row.stop_name ?? "",
      lat: toNum(row.stop_lat),
      lon: toNum(row.stop_lon),
      locationType: toNum(row.location_type),
      parentStation: row.parent_station || null,
      platformCode: row.platform_code || null,
    })
  })

  // 5. Service dates for rail services. The feed may ship calendar.txt (weekly
  // schedule + date range), calendar_dates.txt (explicit per-date exceptions), or
  // both — expand whichever exist into an active (service_id, date) set.
  const active = new Map<string, Set<string>>()
  let calStart: string | null = null
  let calEnd: string | null = null
  const addActive = (serviceId: string, date: string) => {
    let set = active.get(serviceId)
    if (!set) {
      set = new Set()
      active.set(serviceId, set)
    }
    set.add(date)
  }

  if (fs.existsSync(file("calendar.txt"))) {
    const DOW = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const
    await streamCsv(file("calendar.txt"), (row) => {
      if (!railServiceIds.has(row.service_id)) return
      const start = gtfsDate(row.start_date)
      const end = gtfsDate(row.end_date)
      if (!start || !end) return
      if (!calStart || start < calStart) calStart = start
      if (!calEnd || end > calEnd) calEnd = end
      for (let d = start; d <= end; d = addDays(d, 1)) {
        const dow = new Date(serviceMidnightMs(d)).getUTCDay()
        if (row[DOW[dow]] === "1") addActive(row.service_id, d)
      }
    })
  }

  if (fs.existsSync(file("calendar_dates.txt"))) {
    await streamCsv(file("calendar_dates.txt"), (row) => {
      if (!railServiceIds.has(row.service_id)) return
      const date = gtfsDate(row.date)
      if (!date) return
      if (row.exception_type === "2") {
        active.get(row.service_id)?.delete(date)
      } else {
        addActive(row.service_id, date)
        if (!calStart || date < calStart) calStart = date
        if (!calEnd || date > calEnd) calEnd = date
      }
    })
  }

  const calendarDates: GtfsCalendarDate[] = []
  for (const [serviceId, dates] of active) {
    for (const serviceDate of dates) calendarDates.push({ serviceId, serviceDate })
  }

  // 6. feed_info.txt (optional). Fall back to the calendar's date span when absent.
  let feedInfo: GtfsFeedInfo = { feedStartDate: calStart, feedEndDate: calEnd, feedVersion: null }
  if (fs.existsSync(file("feed_info.txt"))) {
    await streamCsv(file("feed_info.txt"), (row) => {
      feedInfo = {
        feedStartDate: gtfsDate(row.feed_start_date) ?? calStart,
        feedEndDate: gtfsDate(row.feed_end_date) ?? calEnd,
        feedVersion: row.feed_version || null,
      }
    })
  }

  // Resolve each called platform stop to its station node (parent or self).
  const platformToStationNode = new Map<string, string>()
  const stationNodes = new Map<string, GtfsStop>()
  for (const stopId of calledStopIds) {
    const stop = stops.get(stopId)
    if (!stop) continue
    const nodeId = stop.parentStation && stops.has(stop.parentStation) ? stop.parentStation : stopId
    platformToStationNode.set(stopId, nodeId)
    if (!stationNodes.has(nodeId)) {
      const node = stops.get(nodeId)
      if (node) stationNodes.set(nodeId, node)
    }
  }

  return { feedInfo, routes, trips, stopTimes, stops, calendarDates, stationNodes, platformToStationNode }
}
