/**
 * siri-debug.ts — token-guarded remote-debugging routes for the SIRI pipeline.
 *
 * The SIRI API is IP-allow-listed, so local machines can't call it; these
 * routes are how we inspect the deployed pipeline and capture real payloads as
 * test fixtures. They only replay state the poller Durable Object already
 * holds — no parameter reaches any upstream request, so they cannot become a
 * proxy.
 *
 * Guarding: everything 404s (not 401 — don't advertise existence) unless
 * SIRI_DEBUG_TOKEN is configured AND the request carries it in x-debug-token.
 */
import { Elysia } from "elysia"

import { config } from "../config"
import { runtime } from "../runtime"
import { POLLER_NAME } from "../siri/snapshot"
import type { SiriSnapshot } from "../siri/types"
import { createRateLimiter } from "../utils/rate-limiter"
import { notFound, rateLimited, safeEqual } from "./helpers"

const limiter = createRateLimiter(60 * 1000, 30)
const poller = () => runtime().SIRI.getByName(POLLER_NAME)
const jsonText = (text: string) => new Response(text, { headers: { "content-type": "application/json; charset=utf-8" } })

export const siriDebugRoutes = new Elysia({ prefix: "/siri" })
  .onBeforeHandle((ctx) => {
    const limited = rateLimited(limiter)(ctx)
    if (limited) return limited

    const token = ctx.request.headers.get("x-debug-token")
    if (!config.siriDebugToken || typeof token !== "string" || !safeEqual(token, config.siriDebugToken)) {
      return notFound(ctx)
    }
  })
  .get("/status", async () => {
    const { status, snapshot: parsed } = (await poller().getDebugState()) as {
      status: Record<string, unknown> | null
      snapshot: SiriSnapshot | null
    }

    let snapshot = null
    if (parsed) {
      snapshot = {
        updatedAt: parsed.updatedAt,
        ageSec: Math.round((Date.now() - parsed.updatedAt) / 1000),
        feedId: parsed.feedId,
        trainsTracked: Object.keys(parsed.trains).length,
      }
    }

    return { pollerSeen: status !== null, status, snapshot }
  })
  // The last poll's raw SIRI chunk bodies — download and promote to test fixtures.
  .get("/raw", async () => jsonText(await poller().getRaw()))
  .get("/unmatched", async () => jsonText(await poller().getUnmatched()))
