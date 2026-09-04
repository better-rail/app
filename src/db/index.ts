import fs from "fs"
import path from "path"
import { Pool, PoolClient } from "pg"

import { databaseUrl } from "../data/config"
import { logNames, logger } from "../logs"

let pool: Pool | undefined

// Timeouts keep a Postgres that has stopped answering from holding requests open
// for good: without them a blackholed host queues connection attempts without
// limit and a hung socket never rejects, so the client sees a hang rather than an
// error. The statement limits are applied on both sides — pg gives up waiting,
// and the server cancels the statement too. Zero disables a limit; the ingest
// turns both statement limits off for its long-running COPY (see configurePool).
export type PoolTimeouts = { connectionTimeoutMs: number; queryTimeoutMs: number; statementTimeoutMs: number }
let timeouts: PoolTimeouts = { connectionTimeoutMs: 5_000, queryTimeoutMs: 30_000, statementTimeoutMs: 30_000 }

/** Override the pool's timeouts. Must run before the pool is first used. */
export const configurePool = (overrides: Partial<PoolTimeouts>) => {
  if (pool) throw new Error("configurePool must be called before the pool is created")
  timeouts = { ...timeouts, ...overrides }
}

/** Lazily-created shared connection pool. */
export const getPool = (): Pool => {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      // Railway Postgres terminates idle connections; keep the pool lean.
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: timeouts.connectionTimeoutMs,
      query_timeout: timeouts.queryTimeoutMs || undefined,
      statement_timeout: timeouts.statementTimeoutMs || undefined,
      keepAlive: true,
    })
    // `logger` is undefined until startLogger() runs (e.g. in standalone scripts).
    pool.on("error", (error) => logger?.error(logNames.db.pool.error, { error }))
  }
  return pool
}

export const query = <T extends Record<string, any> = any>(text: string, params?: any[]) => {
  return getPool().query<T>(text, params)
}

/** Run `fn` inside a transaction, rolling back on error. */
export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    const result = await fn(client)
    await client.query("COMMIT")
    return result
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/** schema.sql lives next to this file in src; the build copies it into dist/db. */
const schemaPath = path.join(__dirname, "schema.sql")

export const applySchema = async () => {
  const sql = fs.readFileSync(schemaPath, "utf8")
  await getPool().query(sql)
}

export type ActiveFeed = {
  feedId: string
  feedStartDate: Date | null
  feedEndDate: Date | null
}

// The active feed only changes when the ingest worker swaps it, so a short
// in-process cache keeps every timetable request from hitting `feeds`.
let activeFeedCache: { value: ActiveFeed | null; expiresAt: number } | undefined
const ACTIVE_FEED_TTL_MS = 30_000

export const getActiveFeed = async (): Promise<ActiveFeed | null> => {
  const now = Date.now()
  if (activeFeedCache && activeFeedCache.expiresAt > now) {
    return activeFeedCache.value
  }

  const { rows } = await query(
    `SELECT feed_id, feed_start_date, feed_end_date FROM feeds WHERE is_active LIMIT 1`,
  )

  const value: ActiveFeed | null = rows[0]
    ? {
        // feed_id is a bigint -> pg returns it as a string; keep it as such.
        feedId: String(rows[0].feed_id),
        feedStartDate: rows[0].feed_start_date ?? null,
        feedEndDate: rows[0].feed_end_date ?? null,
      }
    : null

  activeFeedCache = { value, expiresAt: now + ACTIVE_FEED_TTL_MS }
  return value
}

export const invalidateActiveFeedCache = () => {
  activeFeedCache = undefined
}
