/**
 * siri-debug.ts — token-guarded remote-debugging routes for the SIRI pipeline.
 *
 * The SIRI API is IP-allow-listed, so local machines can't call it; these
 * routes are how we inspect the deployed pipeline and capture real payloads as
 * test fixtures. They only replay state the poller already wrote to redis —
 * no parameter reaches any upstream request, so they cannot become a proxy.
 *
 * Guarding: everything 404s (not 401 — don't advertise existence) unless
 * SIRI_DEBUG_TOKEN is configured AND the request carries it in x-debug-token.
 */
import { timingSafeEqual } from "crypto"
import { NextFunction, Request, Response, Router } from "express"

import { siriDebugToken } from "../data/config"
import { getRedisClient } from "../data/redis"
import { RAW_KEY, SNAPSHOT_KEY, STATUS_KEY, UNMATCHED_KEY } from "../siri/snapshot"
import { SiriSnapshot } from "../siri/types"
import { createRateLimiter } from "../utils/rate-limiter"

const guard = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["x-debug-token"]
  if (!siriDebugToken || typeof token !== "string") {
    return res.sendStatus(404)
  }
  const provided = Buffer.from(token)
  const expected = Buffer.from(siriDebugToken)
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return res.sendStatus(404)
  }
  next()
}

const readKey = async (key: string): Promise<string | null> => {
  try {
    return (await getRedisClient()?.get(key)) ?? null
  } catch {
    return null
  }
}

const siriDebugRouter = Router()
siriDebugRouter.use(createRateLimiter(60 * 1000, 30))
siriDebugRouter.use(guard)

siriDebugRouter.get("/status", async (req, res) => {
  const [statusJson, snapshotJson] = await Promise.all([readKey(STATUS_KEY), readKey(SNAPSHOT_KEY)])
  const status = statusJson ? JSON.parse(statusJson) : null

  let snapshot = null
  if (snapshotJson) {
    const parsed = JSON.parse(snapshotJson) as SiriSnapshot
    snapshot = {
      updatedAt: parsed.updatedAt,
      ageSec: Math.round((Date.now() - parsed.updatedAt) / 1000),
      feedId: parsed.feedId,
      trainsTracked: Object.keys(parsed.trains).length,
    }
  }

  res.json({ pollerSeen: status !== null, status, snapshot })
})

// The last poll's raw SIRI chunk bodies — download and promote to test fixtures.
siriDebugRouter.get("/raw", async (req, res) => {
  res.type("application/json").send((await readKey(RAW_KEY)) ?? "[]")
})

siriDebugRouter.get("/unmatched", async (req, res) => {
  res.type("application/json").send((await readKey(UNMATCHED_KEY)) ?? "[]")
})

export { siriDebugRouter }
