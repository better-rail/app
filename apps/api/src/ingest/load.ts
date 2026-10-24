/**
 * load.ts — load a RailFeedPayload (built by ingest/main.ts) into D1.
 *
 * Pure functions over a `D1Database`; the routes that call them live elsewhere.
 * Mirrors the Bun server's ingest-gtfs.ts loader with D1's constraints: there is
 * no COPY and no long transaction, so each table goes in as chunked multi-row
 * INSERTs (≤ 100 bound parameters per statement, a few hundred statements per
 * `batch()`), and only the final `batch()` — clear the old active flag, set the
 * new one — is the atomic swap. The previous feed keeps serving reads until
 * then, and a load that fails midway leaves an inactive feed that the next
 * successful load prunes.
 */
import { applySchema, invalidateActiveFeedCache, query } from "../db"
import { loadLearnedPlatforms, platformKey } from "../siri/platform-store"
import type { RailFeedPayload } from "./payload"

export type IngestLog = (message: string, meta?: unknown) => void

export type LoadResult = {
  feedId: string
  counts: Record<(typeof FEED_TABLES)[number], number>
  pruned: string[]
  warnings: string[]
}

export type ActiveFeedSummary = { feedId: string; checksum: string; feedEndDate: string | null }

/** Thrown when the payload's checksum equals the active feed's — nothing to load. */
export class UnchangedFeedError extends Error {
  readonly feedId: string
  readonly checksum: string
  constructor(feedId: string, checksum: string) {
    super(`feed unchanged since last ingest (checksum match on feed ${feedId})`)
    this.name = "UnchangedFeedError"
    this.feedId = feedId
    this.checksum = checksum
  }
}

const FEED_TABLES = ["stops", "station_map", "routes", "trips", "calendar_dates", "stop_times"] as const

const MAX_PARAMS_PER_STATEMENT = 100
const STATEMENTS_PER_BATCH = 200

/** The active feed, for the container's "is this feed new?" check. */
export const activeFeedSummary = async (database: D1Database): Promise<ActiveFeedSummary | null> => {
  const { rows } = await query<{ feed_id: number; checksum: string; feed_end_date: string | null }>(
    `SELECT feed_id, checksum, feed_end_date FROM feeds WHERE is_active = 1 LIMIT 1`,
    [],
    database,
  )
  const row = rows[0]
  return row ? { feedId: String(row.feed_id), checksum: row.checksum, feedEndDate: row.feed_end_date ?? null } : null
}

// Platforms already baked into a feed, keyed `${trainNumber}:${railId}`. Used to
// carry platforms forward for (train, station) pairs SIRI hasn't observed yet.
const loadFeedPlatforms = async (database: D1Database, feedId: string): Promise<Map<string, number>> => {
  const map = new Map<string, number>()
  const { rows } = await query<{ train_number: number; rail_id: number; platform_code: string }>(
    `SELECT DISTINCT t.train_number, st.rail_id, st.platform_code
       FROM stop_times st
       JOIN trips t ON t.feed_id = st.feed_id AND t.trip_id = st.trip_id
      WHERE st.feed_id = ? AND st.platform_code IS NOT NULL AND st.rail_id IS NOT NULL`,
    [feedId],
    database,
  )
  for (const r of rows) {
    const platform = parseInt(r.platform_code, 10)
    if (Number.isFinite(platform) && platform > 0) map.set(platformKey(r.train_number, r.rail_id), platform)
  }
  return map
}

type Scalar = string | number | null

/**
 * `INSERT INTO table (cols) VALUES (...), (...)` statements for `rows`, each
 * holding as many rows as fit under D1's 100-parameter cap.
 */
const insertStatements = <T>(
  database: D1Database,
  table: string,
  columns: string[],
  rows: readonly T[],
  toCols: (row: T) => Scalar[],
): D1PreparedStatement[] => {
  const rowsPerStatement = Math.floor(MAX_PARAMS_PER_STATEMENT / columns.length)
  const placeholders = `(${columns.map(() => "?").join(", ")})`
  const statements: D1PreparedStatement[] = []
  for (let i = 0; i < rows.length; i += rowsPerStatement) {
    const chunk = rows.slice(i, i + rowsPerStatement)
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${chunk.map(() => placeholders).join(", ")}`
    statements.push(database.prepare(sql).bind(...chunk.flatMap((row) => toCols(row).map((v) => (v === undefined ? null : v)))))
  }
  return statements
}

/** Run statements in batches: each `batch()` is one transaction and one round trip. */
const runBatched = async (database: D1Database, statements: D1PreparedStatement[]) => {
  for (let i = 0; i < statements.length; i += STATEMENTS_PER_BATCH) {
    await database.batch(statements.slice(i, i + STATEMENTS_PER_BATCH))
  }
}

const validityWarning = (feedEndDate: string | null, now = Date.now()): string | null => {
  if (!feedEndDate) return null
  const end = Date.parse(`${feedEndDate}T00:00:00Z`)
  const twoDays = 2 * 86_400 * 1000
  if (now > end - twoDays) {
    return `active feed validity window is closing (feed_end_date ${feedEndDate}) — ensure the nightly ingest is running`
  }
  return null
}

// Keep the two newest feeds (active + previous); delete the rest, one feed per
// batch so a partial prune still leaves every remaining feed whole.
const pruneOldFeeds = async (database: D1Database, log: IngestLog): Promise<string[]> => {
  const { rows } = await query<{ feed_id: number }>(`SELECT feed_id FROM feeds ORDER BY feed_id DESC`, [], database)
  const toDelete = rows.slice(2).map((r) => String(r.feed_id))
  for (const feedId of toDelete) {
    await database.batch([
      ...FEED_TABLES.map((table) => database.prepare(`DELETE FROM ${table} WHERE feed_id = ?`).bind(feedId)),
      database.prepare(`DELETE FROM feeds WHERE feed_id = ?`).bind(feedId),
    ])
  }
  if (toDelete.length) log(`pruned ${toDelete.length} old feed(s)`, { toDelete })
  return toDelete
}

/**
 * Load the payload under a new feed_id, swap it in as the active feed and prune
 * feeds older than the previous one. Throws `UnchangedFeedError` when the active
 * feed already has this checksum.
 */
export const loadFeed = async (database: D1Database, payload: RailFeedPayload, log: IngestLog): Promise<LoadResult> => {
  await applySchema(database)

  const previousFeed = await activeFeedSummary(database)
  if (previousFeed && previousFeed.checksum === payload.checksum) {
    throw new UnchangedFeedError(previousFeed.feedId, payload.checksum)
  }

  const warnings = [...payload.warnings]
  for (const warning of payload.warnings) log(`⚠️ ${warning}`)

  // GTFS has no train platforms; bake in the scheduled platforms the SIRI poller
  // has learned (siri/platform-store.ts) so the live query path stays pure DB.
  // Best-effort: a (train, station) pair never observed just has no platform.
  const platforms = await loadLearnedPlatforms(database)
  log(`platforms: ${platforms.size} SIRI-learned (train,station) entries`)

  // Carry platforms forward from the currently-active feed — a (train, station)
  // platform is date-stable, so the previous feed's value (including ones from
  // the retired Israel Railways fetch) still fills holes the learned table
  // hasn't covered yet.
  const previousPlatforms = previousFeed ? await loadFeedPlatforms(database, previousFeed.feedId) : new Map<string, number>()
  if (!platforms.size && previousPlatforms.size) {
    log(`⚠️ no SIRI-learned platforms yet — carrying forward ${previousPlatforms.size} from feed ${previousFeed!.feedId}`)
  }

  const inserted = await database
    .prepare(
      `INSERT INTO feeds (checksum, feed_start_date, feed_end_date, feed_version, is_active)
       VALUES (?, ?, ?, ?, 0) RETURNING feed_id`,
    )
    .bind(payload.checksum, payload.feedInfo.feedStartDate, payload.feedInfo.feedEndDate, payload.feedInfo.feedVersion)
    .first<{ feed_id: number }>()
  if (!inserted) throw new Error("INSERT INTO feeds returned no row")
  const feedId = String(inserted.feed_id)
  log(`loading feed ${feedId}`, { checksum: payload.checksum })

  const trainNumbers = new Map<string, number>()
  for (const t of payload.trips) trainNumbers.set(t.tripId, t.trainNumber)

  const statements: D1PreparedStatement[] = [
    ...insertStatements(
      database,
      "stops",
      [
        "feed_id",
        "stop_id",
        "stop_code",
        "stop_name",
        "stop_lat",
        "stop_lon",
        "location_type",
        "parent_station",
        "platform_code",
      ],
      payload.stops,
      (s) => [feedId, s.stopId, s.stopCode, s.stopName, s.lat, s.lon, s.locationType, s.parentStation, s.platformCode],
    ),
    ...insertStatements(
      database,
      "station_map",
      ["feed_id", "gtfs_station_id", "rail_id", "stop_code"],
      payload.stationMap,
      (m) => [feedId, m.gtfsStationId, m.railId, m.stopCode],
    ),
    ...insertStatements(database, "routes", ["feed_id", "route_id", "route_long_name"], payload.routes, (r) => [
      feedId,
      r.routeId,
      r.routeLongName,
    ]),
    ...insertStatements(
      database,
      "trips",
      ["feed_id", "trip_id", "route_id", "service_id", "train_number"],
      payload.trips,
      (t) => [feedId, t.tripId, t.routeId, t.serviceId, t.trainNumber],
    ),
    ...insertStatements(database, "calendar_dates", ["feed_id", "service_id", "service_date"], payload.calendarDates, (c) => [
      feedId,
      c.serviceId,
      c.serviceDate,
    ]),
    ...insertStatements(
      database,
      "stop_times",
      ["feed_id", "trip_id", "stop_sequence", "stop_id", "arr_offset_sec", "dep_offset_sec", "platform_code", "rail_id"],
      payload.stopTimes,
      (st) => {
        const trainNumber = trainNumbers.get(st.tripId)
        const key = st.railId && trainNumber ? platformKey(trainNumber, st.railId) : null
        // Prefer the SIRI-learned platform, then the previous feed's, then the
        // GTFS platform_code (empty for rail), then none.
        const platform = key ? (platforms.get(key) ?? previousPlatforms.get(key)) : undefined
        const platformCode = platform !== undefined ? String(platform) : st.gtfsPlatformCode
        return [feedId, st.tripId, st.stopSequence, st.stopId, st.arrOffsetSec, st.depOffsetSec, platformCode, st.railId]
      },
    ),
  ]
  await runBatched(database, statements)

  // Atomic active-feed swap: clear the old, set the new, in one batch (= one transaction).
  await database.batch([
    database.prepare(`UPDATE feeds SET is_active = 0 WHERE is_active = 1 AND feed_id <> ?`).bind(feedId),
    database.prepare(`UPDATE feeds SET is_active = 1 WHERE feed_id = ?`).bind(feedId),
  ])
  invalidateActiveFeedCache()
  log(`activated feed ${feedId}`)

  const pruned = await pruneOldFeeds(database, log)

  const expiring = validityWarning(payload.feedInfo.feedEndDate)
  if (expiring) {
    log(`⚠️ ${expiring}`)
    warnings.push(expiring)
  }

  return {
    feedId,
    counts: {
      stops: payload.stops.length,
      station_map: payload.stationMap.length,
      routes: payload.routes.length,
      trips: payload.trips.length,
      calendar_dates: payload.calendarDates.length,
      stop_times: payload.stopTimes.length,
    },
    pruned,
    warnings,
  }
}

export { decodePayload } from "./payload"
