/**
 * internal.ts — `/internal/*`: the operator's routes, guarded by INGEST_TOKEN.
 *
 * What used to be Railway cron jobs and CLIs talking to Postgres/redis directly
 * now reaches the data through the Worker: the ingest container posts the
 * parsed GTFS feed here, `bun run rail:pull` seeds the fares snapshot from
 * saved payloads, and an on-demand fares pull can be triggered without waiting
 * for the weekly cron. Everything 404s without the token (don't advertise).
 */
import { Elysia } from "elysia"

import { config } from "../config"
import { db } from "../db"
import { invalidateActiveFeedCache } from "../db"
import { logNames, logger } from "../logs"
import { UnchangedFeedError, activeFeedSummary, decodePayload, loadFeed } from "../ingest/load"
import { parseFarePayloads, syncFares } from "../fares/sync"
import { startIngest } from "../ingest/container"
import { json, notFound, safeEqual } from "./helpers"

const bearer = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""

export const internalRoutes = new Elysia({ prefix: "/internal" })
  .onBeforeHandle((ctx) => {
    const token = config.ingestToken
    if (!token || !safeEqual(bearer(ctx.request), token)) return notFound(ctx)
  })
  // The active feed, for the ingest's checksum idempotency check.
  .get("/ingest/active", async () => (await activeFeedSummary(db())) ?? null)
  // Load a parsed rail feed (gzip JSON) into D1 under a new feed id and activate it.
  .post(
    "/ingest",
    async (ctx) => {
      const log = (message: string, meta?: unknown) => logger.info(`[ingest] ${message}`, meta ? { meta } : undefined)
      try {
        const payload = await decodePayload(ctx.request)
        logger.info(logNames.gtfs.ingest.start, { checksum: payload.checksum, stopTimes: payload.stopTimes.length })
        const result = await loadFeed(db(), payload, log)
        invalidateActiveFeedCache()
        logger.info(logNames.gtfs.ingest.swapped, { feedId: result.feedId, pruned: result.pruned, warnings: result.warnings })
        return result
      } catch (error) {
        if (error instanceof UnchangedFeedError) {
          logger.info(logNames.gtfs.ingest.unchanged)
          return json(ctx, 200, { unchanged: true })
        }
        logger.error(logNames.gtfs.ingest.failed, { error })
        return json(ctx, 500, { error: (error as Error).message })
      }
    },
    { parse: "none" },
  )
  // Kick the ingest container now instead of waiting for the nightly cron.
  .post("/ingest/run", async (ctx) => {
    try {
      return await startIngest(new URL(ctx.request.url).origin)
    } catch (error) {
      logger.error(logNames.gtfs.ingest.failed, { error })
      return json(ctx, 500, { error: (error as Error).message })
    }
  })
  // Pull the fares from the rail API now.
  .post("/fares/pull", async (ctx) => {
    try {
      return await syncFares()
    } catch (error) {
      logger.error(logNames.fares.pullFailed, { error })
      return json(ctx, 500, { error: (error as Error).message })
    }
  })
  // Seed the fares snapshot from saved GetProfiles / GetAllPriceWithNotes payloads.
  .post(
    "/fares/snapshot",
    async (ctx) => {
      try {
        return await syncFares(parseFarePayloads(ctx.body))
      } catch (error) {
        logger.error(logNames.fares.pullFailed, { error })
        return json(ctx, 400, { error: (error as Error).message })
      }
    },
    { parse: "json" },
  )
