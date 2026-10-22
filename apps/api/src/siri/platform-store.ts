/**
 * platform-store.ts — scheduled platforms learned from the SIRI realtime feed.
 *
 * The MOT GTFS feed has no train→platform link (rail stop_times reference
 * station-level stops with an empty platform_code), and the Israel Railways API
 * is no longer queried — so SIRI is the platform source: every poll cycle the
 * poller records the platform reported for each (train, station) into the
 * feed-independent train_platforms table, and the nightly GTFS ingest bakes the
 * accumulated values into stop_times.platform_code, keeping the live query path
 * pure DB.
 *
 * A (train, station) platform is date-stable, so a value observed today applies
 * to future service days. A one-off live platform change does get recorded, but
 * it is corrected the next time the train is observed on its usual platform.
 *
 * On D1 the upsert is chunked: a statement may bind at most 100 parameters, so
 * the observations go out as rows-of-three in one `batch()` (one transaction).
 */
import type { D1Database, D1PreparedStatement } from "@cloudflare/workers-types"
import { db, query } from "../db"
import { logNames, logger } from "../logs"

/** Key into a platform map: `${trainNumber}:${stationId}` (stationId is the 3700-style id). */
export const platformKey = (trainNumber: number, stationId: number) => `${trainNumber}:${stationId}`

export type PlatformObservation = { trainNumber: number; railId: number; platform: number }

const PARAMS_PER_ROW = 3
const ROWS_PER_STATEMENT = Math.floor(100 / PARAMS_PER_ROW)

// Last value written per (train, station) for this isolate's lifetime — successive
// cycles mostly observe the same platforms, so the steady-state write set is empty.
const lastWritten = new Map<string, number>()

/**
 * Upsert SIRI-observed platforms into train_platforms. Returns the number of
 * rows written. Never throws — a failed write is logged and retried naturally
 * on a later cycle (the observations keep coming while the train is monitored).
 */
export const recordObservedPlatforms = async (observations: PlatformObservation[], database = db()): Promise<number> => {
  // Dedupe by (train, station) — a train can produce several visits per cycle —
  // and skip values already written, so most cycles write nothing.
  const changed = new Map<string, PlatformObservation>()
  for (const o of observations) {
    const key = platformKey(o.trainNumber, o.railId)
    if (lastWritten.get(key) !== o.platform) changed.set(key, o)
  }
  if (changed.size === 0) return 0

  const rows = [...changed.values()]
  const statements: D1PreparedStatement[] = []
  for (let i = 0; i < rows.length; i += ROWS_PER_STATEMENT) {
    const chunk = rows.slice(i, i + ROWS_PER_STATEMENT)
    const values = chunk.map(() => "(?, ?, ?)").join(", ")
    const params = chunk.flatMap((o) => [o.trainNumber, o.railId, o.platform])
    statements.push(
      database
        .prepare(
          `INSERT INTO train_platforms (train_number, rail_id, platform)
           VALUES ${values}
           ON CONFLICT (train_number, rail_id)
           DO UPDATE SET platform = excluded.platform, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        )
        .bind(...params),
    )
  }

  try {
    await database.batch(statements)
  } catch (error) {
    logger.error(logNames.platforms.writeFailed, { error, observations: changed.size })
    return 0
  }

  for (const [key, o] of changed) lastWritten.set(key, o.platform)
  return changed.size
}

/** All learned platforms, keyed `${trainNumber}:${railId}` — read by the GTFS ingest. */
export const loadLearnedPlatforms = async (database = db()): Promise<Map<string, number>> => {
  const map = new Map<string, number>()
  const { rows } = await query<{ train_number: number; rail_id: number; platform: number }>(
    `SELECT train_number, rail_id, platform FROM train_platforms`,
    [],
    database,
  )
  for (const row of rows) map.set(platformKey(row.train_number, row.rail_id), row.platform)
  return map
}
