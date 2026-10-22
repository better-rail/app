/**
 * fares.ts — `/fares`: Israel Railways' prices, from the snapshot in KV.
 *
 *   GET /fares?from=3700&to=5010  ->  { from, to, distanceCode, prices: { single, daily, monthly }, updatedAt }
 *   GET /fares/profiles            ->  { updatedAt, profiles: [{ id, name, discounts, note }] }
 *
 * The snapshot is what the weekly pull last stored (fares/sync.ts); these
 * routes never call the rail API and take no part in RAIL_DATA_SOURCE. Without
 * a snapshot they answer 503, and an unknown pair 404.
 */
import { Context, Elysia } from "elysia"
import { z } from "zod"

import { findFare, getFareSnapshot } from "../fares/store"
import { logNames, logger } from "../logs"
import { createRateLimiter } from "../utils/rate-limiter"
import { json, rateLimited } from "./helpers"

const stationId = z.coerce.number().int().positive()
export const FareQuery = z.object({ from: stationId, to: stationId })

const unavailable = (ctx: Pick<Context, "set">) => {
  logger.error(logNames.fares.notAvailable)
  return json(ctx, 503, { error: "Fares are not available yet" })
}

const limiter = createRateLimiter(10 * 60 * 1000, 1000)

export const faresRoutes = new Elysia({ prefix: "/fares" })
  .onBeforeHandle(rateLimited(limiter))
  .get("/profiles", async (ctx) => {
    const snapshot = await getFareSnapshot()
    if (!snapshot) return unavailable(ctx)
    return { updatedAt: snapshot.pulledAt, profiles: snapshot.profiles }
  })
  .get("/", async (ctx) => {
    const query = FareQuery.safeParse(ctx.query)
    if (!query.success) return json(ctx, 400, { error: "Expected numeric `from` and `to` station ids" })

    const snapshot = await getFareSnapshot()
    if (!snapshot) return unavailable(ctx)

    const { from, to } = query.data
    const fare = findFare(snapshot, from, to)
    if (!fare) return json(ctx, 404, { error: "No fare for this station pair" })

    return { from, to, distanceCode: fare.distanceCode, prices: fare.prices, updatedAt: snapshot.pulledAt }
  })
