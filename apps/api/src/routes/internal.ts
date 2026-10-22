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
import { isApnConfigured, sendApnNotification } from "../push/apns"
import { isFcmConfigured, sendFcmNotification } from "../push/fcm"
import { json, jsonBody, notFound, safeEqual } from "./helpers"

const describe = (error: unknown) =>
  error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      }
    : error

const bearer = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""

export const internalRoutes = new Elysia({ prefix: "/internal" })
  .onBeforeHandle((ctx) => {
    const token = config.ingestToken
    if (!token || !safeEqual(bearer(ctx.request), token)) return notFound(ctx)
  })
  // The active feed, for the ingest's checksum idempotency check. A bare `null` would leave the body
  // empty, so the JSON is written out explicitly.
  .get("/ingest/active", async () => Response.json((await activeFeedSummary(db())) ?? null))
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
  // Push probe: sends a minimal payload to `token` and reports the provider's verdict. With a dummy token the
  // expected answers are APNs `BadDeviceToken` (which proves the HTTP/2 + JWT path) and FCM
  // `messaging/invalid-argument` or `…-not-registered` (which proves the OAuth exchange); a real token gets a push.
  .post(
    "/push/probe",
    async (ctx) => {
      const { provider, token } = jsonBody(ctx.body) as { provider?: string; token?: string }
      if (!token || (provider !== "ios" && provider !== "android")) {
        return json(ctx, 400, { error: "Expected { provider: 'ios' | 'android', token }" })
      }
      try {
        if (provider === "ios") {
          if (!isApnConfigured()) return json(ctx, 503, { error: "APNs is not configured" })
          await sendApnNotification(
            token,
            { timestamp: Math.floor(Date.now() / 1000), event: "update", "content-state": {} },
            "throttled",
          )
          return { provider, delivered: true }
        }
        if (!isFcmConfigured()) return json(ctx, 503, { error: "FCM is not configured" })
        const messageId = await sendFcmNotification({
          token,
          data: { type: "probe" },
          android: { priority: "normal", ttl: 60_000 },
        })
        return { provider, delivered: true, messageId }
      } catch (error) {
        return json(ctx, 502, { provider, delivered: false, error: describe(error) })
      }
    },
    { parse: "json" },
  )
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
