/**
 * payload.test.ts — the container half of the ingest, end to end without the
 * network: a synthetic extracted MOT feed (BOM, >24:00 times, an unescaped
 * gershayim quote) -> parseRailFeed -> matchStations -> buildPayload, and the
 * gzip round trip through encodePayload/decodePayload that carries it to the Worker.
 */
import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import fs from "fs"
import os from "os"
import path from "path"

import { parseRailFeed, type RailFeed } from "../../../ingest/parse"
import { matchStations, type KnownStation, type MatchResult } from "../../../ingest/station-match"
import { buildPayload, StationMappingError } from "../../../ingest/build-payload"
import { decodePayload, encodePayload, parsePayload, toWire, type RailFeedPayload } from "../../../src/ingest/payload"

const BOM = "﻿"

// Two stations the fixture serves, plus one that is absent from it (no service -> warning).
const known: KnownStation[] = [
  { id: "3700", hebrew: "תל אביב - סבידור מרכז", english: "Tel Aviv - Savidor Center", lat: 32.083715, lon: 34.798247 },
  { id: "3500", hebrew: "הרצליה", english: "Herzliya", lat: 32.163558, lon: 34.817406 },
  { id: "1220", hebrew: "מרכזית המפרץ (לב המפרץ)", english: "HaMifrats Central Station", lat: 32.792942, lon: 35.032964 },
]

const files: Record<string, string> = {
  "routes.txt": [
    "route_id,agency_id,route_short_name,route_long_name,route_desc,route_type,route_color",
    "R1,2,,תל אביב - סבידור מרכז - הרצליה,,2,",
    "R2,2,,הרצליה - תל אביב - סבידור מרכז,,2,",
    "B9,3,9,קו 9,,3,",
  ].join("\n"),
  "trips.txt": [
    "route_id,service_id,trip_id,trip_headsign,direction_id,shape_id",
    "R1,S1,T1,100,0,",
    "R2,S1,T2,200,1,",
    "B9,S9,T9,קניון,0,",
  ].join("\n"),
  "stop_times.txt": [
    "trip_id,arrival_time,departure_time,stop_id,stop_sequence,pickup_type,drop_off_type,shape_dist_traveled",
    "T1,23:50:00,23:52:00,P3700,1,0,0,0",
    "T1,25:30:00,25:31:00,P3500,2,0,0,0",
    "T2,06:00:00,06:00:00,P3500,1,0,0,0",
    "T2,06:20:00,06:21:00,P3700,2,0,0,0",
    "T9,07:00:00,07:00:00,BUS1,1,0,0,0",
  ].join("\n"),
  "stops.txt": [
    "stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,location_type,parent_station,zone_id,platform_code",
    // Unescaped ASCII double-quote mid-field (gershayim) — the MOT feed does this.
    `N3700,17000,ת"א - סבידור מרכז,,32.083715,34.798247,1,,0,`,
    `P3700,17001,ת"א - סבידור מרכז רציף 3,,32.083715,34.798247,0,N3700,0,3`,
    "N3500,17100,הרצליה,,32.163558,34.817406,1,,0,",
    "P3500,17101,הרצליה רציף 1,,32.163558,34.817406,0,N3500,0,",
    "BUS1,20001,תחנת אוטובוס,,32.1,34.8,0,,0,",
  ].join("\n"),
  "calendar_dates.txt": ["service_id,date,exception_type", "S1,20261022,1", "S1,20261023,1", "S9,20261022,1"].join("\n"),
  "feed_info.txt": [
    "feed_publisher_name,feed_publisher_url,feed_lang,feed_start_date,feed_end_date,feed_version",
    "MOT,https://gtfs.mot.gov.il,he,20261022,20261031,2.0",
  ].join("\n"),
}

let dir: string
let feed: RailFeed
let match: MatchResult
let payload: RailFeedPayload

beforeAll(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs-fixture-"))
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), BOM + content + "\n")
  feed = await parseRailFeed(dir)
  match = matchStations([...feed.stationNodes.values()], known)
  payload = buildPayload(feed, match, "abc123")
})

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe("buildPayload", () => {
  it("keeps only the rail subset", () => {
    expect(payload.routes.map((r) => r.routeId).sort()).toEqual(["R1", "R2"])
    expect(payload.trips.map((t) => t.tripId).sort()).toEqual(["T1", "T2"])
    expect(payload.trips.find((t) => t.tripId === "T1")?.trainNumber).toBe(100)
    expect(payload.stopTimes).toHaveLength(4)
    expect(payload.calendarDates).toHaveLength(2)
    expect(payload.calendarDates.every((c) => c.serviceId === "S1")).toBe(true)
  })

  it("loads the called platform stops plus their station nodes, with the gershayim name intact", () => {
    expect(payload.stops.map((s) => s.stopId).sort()).toEqual(["N3500", "N3700", "P3500", "P3700"])
    expect(payload.stops.find((s) => s.stopId === "N3700")?.stopName).toBe('ת"א - סבידור מרכז')
    expect(payload.stops.find((s) => s.stopId === "P3700")?.parentStation).toBe("N3700")
  })

  it("stores extended (>24:00) times as seconds from service-day midnight", () => {
    const late = payload.stopTimes.find((st) => st.tripId === "T1" && st.stopSequence === 2)!
    expect(late.arrOffsetSec).toBe(25 * 3600 + 30 * 60)
    expect(late.depOffsetSec).toBe(25 * 3600 + 31 * 60)
  })

  it("maps station nodes to rail ids and denormalizes them onto stop_times", () => {
    expect(payload.stationMap.sort((a, b) => a.railId - b.railId)).toEqual([
      { gtfsStationId: "N3500", railId: 3500, stopCode: "17100" },
      { gtfsStationId: "N3700", railId: 3700, stopCode: "17000" },
    ])
    const byStop = Object.fromEntries(payload.stopTimes.map((st) => [`${st.tripId}:${st.stopId}`, st]))
    expect(byStop["T1:P3700"].railId).toBe(3700)
    expect(byStop["T1:P3500"].railId).toBe(3500)
    expect(byStop["T1:P3700"].gtfsPlatformCode).toBe("3")
    expect(byStop["T1:P3500"].gtfsPlatformCode).toBeNull()
  })

  it("carries feed_info and warns about known stations absent from the feed", () => {
    expect(payload.checksum).toBe("abc123")
    expect(payload.feedInfo).toEqual({ feedStartDate: "2026-10-22", feedEndDate: "2026-10-31", feedVersion: "2.0" })
    expect(payload.warnings).toHaveLength(1)
    expect(payload.warnings[0]).toContain("1 known station(s) absent from this feed")
    expect(payload.warnings[0]).toContain("1220")
  })

  it("aborts when a traversed station has no mapping", () => {
    const partial = matchStations([...feed.stationNodes.values()], known.slice(0, 1))
    expect(() => buildPayload(feed, partial, "abc123")).toThrow(StationMappingError)
    expect(() => buildPayload(feed, partial, "abc123")).toThrow(/Unmapped traversed stations: \["N3500 הרצליה"\]/)
  })
})

describe("payload codec", () => {
  it("round-trips through the wire form", () => {
    expect(parsePayload(JSON.parse(JSON.stringify(toWire(payload))))).toEqual(payload)
  })

  it("rejects a malformed document", () => {
    const wire = toWire(payload) as unknown as { stopTimes: unknown[] }
    expect(() => parsePayload({ ...wire, stopTimes: [["T1", "not-a-number", "P3700", 0, 0, null, null]] })).toThrow()
    expect(() => parsePayload({ ...wire, v: 99 })).toThrow()
  })

  it("gzips and decodes from a Content-Encoding: gzip request", async () => {
    const body = await encodePayload(payload)
    expect(body[0]).toBe(0x1f)
    expect(body[1]).toBe(0x8b)
    expect(body.byteLength).toBeLessThan(JSON.stringify(toWire(payload)).length)

    const request = new Request("http://worker/internal/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
      body,
    })
    expect(await decodePayload(request)).toEqual(payload)
  })

  it("accepts a plain JSON body too", async () => {
    const request = new Request("http://worker/internal/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toWire(payload)),
    })
    expect(await decodePayload(request)).toEqual(payload)
  })
})
