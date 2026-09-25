/**
 * fares.ts — `/fares`: Israel Railways' prices, from the snapshot in redis.
 *
 *   GET /fares?from=3700&to=5010  ->  { from, to, distanceCode, prices: { single, daily, monthly }, updatedAt }
 *   GET /fares/profiles            ->  { updatedAt, profiles: [{ id, name, discounts, note }] }
 *
 * The snapshot is what `bun run rail:pull` last stored (fares/store.ts); these
 * routes never call the rail API and take no part in RAIL_DATA_SOURCE. Without
 * a snapshot they answer 503, and an unknown pair 404.
 */
import { Request, Response, Router } from "express"
import { z } from "zod"

import { findFare, getFareSnapshot } from "../fares/store"
import { logNames, logger } from "../logs"
import { createRateLimiter } from "../utils/rate-limiter"
import { asyncHandler, getRequestId, sendApiError } from "../api-error"

const stationId = z.coerce.number().int().positive()
export const FareQuery = z.object({ from: stationId, to: stationId })

const unavailable = (res: Response) => {
  logger?.error(logNames.fares.notAvailable, { requestId: getRequestId(res) })
  sendApiError(res, {
    status: 503,
    code: "FARES_UNAVAILABLE",
    message: "Fare data is temporarily unavailable",
    retryable: true,
    legacy: { error: "Fares are not available yet" },
  })
}

const faresRouter = Router()
faresRouter.use(createRateLimiter(10 * 60 * 1000, 1000))

faresRouter.get(
  "/profiles",
  asyncHandler(async (_req, res) => {
    const snapshot = await getFareSnapshot()
    if (!snapshot) return unavailable(res)
    res.json({ updatedAt: snapshot.pulledAt, profiles: snapshot.profiles })
  }),
)

faresRouter.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const query = FareQuery.safeParse(req.query)
    if (!query.success) {
      return sendApiError(res, {
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Expected numeric `from` and `to` station ids",
        retryable: false,
      })
    }

    const snapshot = await getFareSnapshot()
    if (!snapshot) return unavailable(res)

    const { from, to } = query.data
    const fare = findFare(snapshot, from, to)
    if (!fare) {
      return sendApiError(res, {
        status: 404,
        code: "NOT_FOUND",
        message: "No fare is available for this station pair",
        retryable: false,
        legacy: { error: "No fare for this station pair" },
      })
    }

    res.json({ from, to, distanceCode: fare.distanceCode, prices: fare.prices, updatedAt: snapshot.pulledAt })
  }),
)

export { faresRouter }
