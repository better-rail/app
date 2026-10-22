/**
 * payload.ts — the JSON contract between the two halves of the GTFS ingest.
 *
 * The container (ingest/main.ts, Bun) downloads and parses the MOT feed and
 * POSTs the rail subset here; the Worker (src/ingest/load.ts) loads it into D1.
 * Both import this file, so it stays pure: types, a zod schema and gzip codecs
 * built on the WHATWG streams both runtimes ship.
 *
 * On the wire each table is an array of positional tuples rather than objects —
 * a day's rail subset is ~150k stop_times rows, and repeating eight keys per row
 * would double the JSON before gzip. `toWire`/`fromWire` map between the tuple
 * form and the readable `RailFeedPayload` the rest of the code uses.
 */
import { z } from "zod"

export type PayloadFeedInfo = { feedStartDate: string | null; feedEndDate: string | null; feedVersion: string | null }

export type PayloadStop = {
  stopId: string
  stopCode: string
  stopName: string
  lat: number | null
  lon: number | null
  locationType: number | null
  parentStation: string | null
  platformCode: string | null
}

export type PayloadStationMap = { gtfsStationId: string; railId: number; stopCode: string }
export type PayloadRoute = { routeId: string; routeLongName: string }
export type PayloadTrip = { tripId: string; routeId: string; serviceId: string; trainNumber: number }
export type PayloadCalendarDate = { serviceId: string; serviceDate: string }
export type PayloadStopTime = {
  tripId: string
  stopSequence: number
  stopId: string
  arrOffsetSec: number
  depOffsetSec: number
  railId: number | null
  gtfsPlatformCode: string | null
}

export type RailFeedPayload = {
  /** sha256 of the zip (or of stop_times.txt when loading an extracted dir). */
  checksum: string
  feedInfo: PayloadFeedInfo
  /** Only called platform stops + their station nodes. */
  stops: PayloadStop[]
  /** Accepted station matches. */
  stationMap: PayloadStationMap[]
  routes: PayloadRoute[]
  trips: PayloadTrip[]
  calendarDates: PayloadCalendarDate[]
  stopTimes: PayloadStopTime[]
  /** e.g. known stations absent from this feed. */
  warnings: string[]
}

// --- wire form ----------------------------------------------------------------

export const WIRE_VERSION = 1

const nullableString = z.string().nullable()
const nullableNumber = z.number().nullable()

const wireStop = z.tuple([
  z.string(), // stopId
  z.string(), // stopCode
  z.string(), // stopName
  nullableNumber, // lat
  nullableNumber, // lon
  nullableNumber, // locationType
  nullableString, // parentStation
  nullableString, // platformCode
])
const wireStationMap = z.tuple([z.string(), z.number().int(), z.string()]) // gtfsStationId, railId, stopCode
const wireRoute = z.tuple([z.string(), z.string()]) // routeId, routeLongName
const wireTrip = z.tuple([z.string(), z.string(), z.string(), z.number().int()]) // tripId, routeId, serviceId, trainNumber
const wireCalendarDate = z.tuple([z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]) // serviceId, serviceDate
const wireStopTime = z.tuple([
  z.string(), // tripId
  z.number().int(), // stopSequence
  z.string(), // stopId
  z.number().int(), // arrOffsetSec
  z.number().int(), // depOffsetSec
  z.number().int().nullable(), // railId
  nullableString, // gtfsPlatformCode
])

export const wirePayloadSchema = z.object({
  v: z.literal(WIRE_VERSION),
  checksum: z.string().min(1),
  feedInfo: z.object({ start: nullableString, end: nullableString, version: nullableString }),
  stops: z.array(wireStop),
  stationMap: z.array(wireStationMap),
  routes: z.array(wireRoute),
  trips: z.array(wireTrip),
  calendarDates: z.array(wireCalendarDate),
  stopTimes: z.array(wireStopTime),
  warnings: z.array(z.string()),
})

export type WirePayload = z.infer<typeof wirePayloadSchema>

export const toWire = (p: RailFeedPayload): WirePayload => ({
  v: WIRE_VERSION,
  checksum: p.checksum,
  feedInfo: { start: p.feedInfo.feedStartDate, end: p.feedInfo.feedEndDate, version: p.feedInfo.feedVersion },
  stops: p.stops.map((s) => [s.stopId, s.stopCode, s.stopName, s.lat, s.lon, s.locationType, s.parentStation, s.platformCode]),
  stationMap: p.stationMap.map((m) => [m.gtfsStationId, m.railId, m.stopCode]),
  routes: p.routes.map((r) => [r.routeId, r.routeLongName]),
  trips: p.trips.map((t) => [t.tripId, t.routeId, t.serviceId, t.trainNumber]),
  calendarDates: p.calendarDates.map((c) => [c.serviceId, c.serviceDate]),
  stopTimes: p.stopTimes.map((st) => [
    st.tripId,
    st.stopSequence,
    st.stopId,
    st.arrOffsetSec,
    st.depOffsetSec,
    st.railId,
    st.gtfsPlatformCode,
  ]),
  warnings: p.warnings,
})

export const fromWire = (w: WirePayload): RailFeedPayload => ({
  checksum: w.checksum,
  feedInfo: { feedStartDate: w.feedInfo.start, feedEndDate: w.feedInfo.end, feedVersion: w.feedInfo.version },
  stops: w.stops.map(([stopId, stopCode, stopName, lat, lon, locationType, parentStation, platformCode]) => ({
    stopId,
    stopCode,
    stopName,
    lat,
    lon,
    locationType,
    parentStation,
    platformCode,
  })),
  stationMap: w.stationMap.map(([gtfsStationId, railId, stopCode]) => ({ gtfsStationId, railId, stopCode })),
  routes: w.routes.map(([routeId, routeLongName]) => ({ routeId, routeLongName })),
  trips: w.trips.map(([tripId, routeId, serviceId, trainNumber]) => ({ tripId, routeId, serviceId, trainNumber })),
  calendarDates: w.calendarDates.map(([serviceId, serviceDate]) => ({ serviceId, serviceDate })),
  stopTimes: w.stopTimes.map(([tripId, stopSequence, stopId, arrOffsetSec, depOffsetSec, railId, gtfsPlatformCode]) => ({
    tripId,
    stopSequence,
    stopId,
    arrOffsetSec,
    depOffsetSec,
    railId,
    gtfsPlatformCode,
  })),
  warnings: w.warnings,
})

/** Validate a decoded JSON document (wire form) into a readable payload; throws a ZodError on a bad document. */
export const parsePayload = (json: unknown): RailFeedPayload => fromWire(wirePayloadSchema.parse(json))

// --- codecs -------------------------------------------------------------------

const GZIP_MAGIC = [0x1f, 0x8b]

const streamOf = (bytes: Uint8Array): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })

const collect = async (stream: ReadableStream<Uint8Array>): Promise<Uint8Array> => {
  const chunks: Uint8Array[] = []
  let size = 0
  const reader = stream.getReader()
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
  }
  const out = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out
}

/** The payload as gzip'd JSON bytes, ready for a `Content-Encoding: gzip` POST. */
export const encodePayload = async (payload: RailFeedPayload): Promise<Uint8Array> => {
  const json = new TextEncoder().encode(JSON.stringify(toWire(payload)))
  return collect(streamOf(json).pipeThrough(new CompressionStream("gzip")))
}

/**
 * Read a payload from a POST request. The body is inflated when the request says
 * `Content-Encoding: gzip` or starts with the gzip magic — the edge may already
 * have inflated a declared-gzip body, so the bytes decide, not the header alone.
 */
export const decodePayload = async (request: Request): Promise<RailFeedPayload> => {
  const raw = new Uint8Array(await request.arrayBuffer())
  const declaredGzip = (request.headers.get("content-encoding") ?? "").toLowerCase().includes("gzip")
  // JSON never starts with the gzip magic, so a declared-gzip body that was already inflated upstream passes through.
  const isGzip = raw.byteLength >= 2 && raw[0] === GZIP_MAGIC[0] && raw[1] === GZIP_MAGIC[1]
  const bytes = isGzip ? await collect(streamOf(raw).pipeThrough(new DecompressionStream("gzip"))) : raw
  if (declaredGzip && !isGzip && bytes.byteLength === 0) throw new Error("Empty gzip payload")
  return parsePayload(JSON.parse(new TextDecoder().decode(bytes)))
}
