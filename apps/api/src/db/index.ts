/**
 * db/index.ts — the GTFS store on D1.
 *
 * D1 is SQLite behind an HTTP binding: no connection pool, no transactions
 * across calls — a `batch()` is the transaction. The query helpers below give
 * the rest of the code the `{ rows }` shape it used against Postgres, and
 * `splitStatements` lets schema.sql be applied through the binding.
 */
import type { D1Database } from "@cloudflare/workers-types"
import schemaSql from "./schema.sql"
import { runtime } from "../runtime"
import { logNames, logger } from "../logs"

export type Row = Record<string, unknown>

export const db = (): D1Database => runtime().DB

/** `SELECT`: the matching rows. `?` placeholders, positional params. */
export const query = async <T extends Row = Row>(
  sql: string,
  params: unknown[] = [],
  database = db(),
): Promise<{ rows: T[] }> => {
  const result = await database
    .prepare(sql)
    .bind(...params)
    .all<T>()
  return { rows: result.results }
}

/** `INSERT`/`UPDATE`/`DELETE`: rows changed. */
export const execute = async (sql: string, params: unknown[] = [], database = db()): Promise<number> => {
  const result = await database
    .prepare(sql)
    .bind(...params)
    .run()
  return result.meta.changes ?? 0
}

/** Split a .sql file into statements (no string literals contain semicolons in ours). */
export const splitStatements = (sql: string): string[] =>
  sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) =>
      statement
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter((statement) => statement.length > 0)

/** Create the tables and indexes (idempotent). */
export const applySchema = async (database = db()) => {
  await database.batch(splitStatements(schemaSql).map((statement) => database.prepare(statement)))
}

export type ActiveFeed = {
  feedId: string
  feedStartDate: string | null
  feedEndDate: string | null
}

// The active feed only changes when an ingest swaps it, so a short per-isolate
// cache keeps every timetable request from hitting `feeds`.
let activeFeedCache: { value: ActiveFeed | null; expiresAt: number } | undefined
const ACTIVE_FEED_TTL_MS = 30_000

export const getActiveFeed = async (): Promise<ActiveFeed | null> => {
  const now = Date.now()
  if (activeFeedCache && activeFeedCache.expiresAt > now) return activeFeedCache.value

  const value = await readActiveFeed()
  activeFeedCache = { value, expiresAt: now + ACTIVE_FEED_TTL_MS }
  return value
}

/** Uncached read of the active feed. */
export const readActiveFeed = async (database = db()): Promise<ActiveFeed | null> => {
  try {
    const { rows } = await query<{ feed_id: number; feed_start_date: string | null; feed_end_date: string | null }>(
      `SELECT feed_id, feed_start_date, feed_end_date FROM feeds WHERE is_active = 1 LIMIT 1`,
      [],
      database,
    )
    const row = rows[0]
    return row
      ? { feedId: String(row.feed_id), feedStartDate: row.feed_start_date ?? null, feedEndDate: row.feed_end_date ?? null }
      : null
  } catch (error) {
    logger.error(logNames.db.pool.error, { error })
    throw error
  }
}

export const invalidateActiveFeedCache = () => {
  activeFeedCache = undefined
}
