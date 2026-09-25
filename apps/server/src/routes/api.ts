import { Response, Router } from "express"

import { ridesEnabled, apiContractV1 } from "../data/config"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
import { handleRailApiRequest, handleSearchTrainRequest } from "./rail-api"
import { faresRouter } from "./fares"
import { siriDebugRouter } from "./siri-debug"
import { DeleteRideBody, UpdateRideTokenBody, bodyValidator } from "./validations"
import { asyncHandler, sendApiError } from "../api-error"
import { endRideNotifications, startRideNotifications, updateRideToken } from "../rides"

const router = Router()

const rideRouter = Router()
const rideRateLimitWindowMs = 10 * 60 * 1000

const sendRideFailure = (res: Response, reason: string) => {
  const unavailable = reason === "timetable_unavailable"
  const status = !apiContractV1
    ? 500
    : unavailable
      ? 503
      : reason === "route_not_found"
        ? 404
        : reason === "ride_in_past" || reason === "ride_in_future"
          ? 409
          : 500
  const code = unavailable
    ? "NO_ACTIVE_FEED"
    : reason === "route_not_found"
      ? "NOT_FOUND"
      : reason === "ride_in_past" || reason === "ride_in_future"
        ? "VALIDATION_ERROR"
        : "INTERNAL_ERROR"
  sendApiError(res, {
    status,
    code,
    message: "The ride request could not be completed",
    retryable: apiContractV1 && (status >= 500 || unavailable),
    legacy: { success: false, reason },
  })
}
// Every route below reads or writes the shared rides state, so they're closed
// while ride tracking is off (a local run, by default — see data/config.ts).
rideRouter.use((req, res, next) => {
  if (!ridesEnabled) {
    return sendApiError(res, {
      status: 503,
      code: "RIDES_DISABLED",
      message: "Ride tracking is disabled",
      retryable: false,
      legacy: { success: false, reason: "rides_disabled" },
    })
  }
  next()
})
// Separate devices sharing a mobile carrier IP into independent buckets.
rideRouter.use(createRateLimiter(rideRateLimitWindowMs, 1000))

rideRouter.post(
  "/",
  bodyValidator(RideRequestSchema),
  createRateLimiter(rideRateLimitWindowMs, 10, (request) => request.body.token),
  asyncHandler(async (req, res) => {
    const ride = buildRide(req.body)
    const result = await startRideNotifications(ride, false, res.locals.requestId)
    if (!result.success) return sendRideFailure(res, result.reason ?? "internal_error")
    res.status(200).json(result)
  }),
)

rideRouter.patch(
  "/updateToken",
  bodyValidator(UpdateRideTokenBody),
  createRateLimiter(rideRateLimitWindowMs, 10, (request) => request.body.rideId),
  asyncHandler(async (req, res) => {
    const { rideId, token } = req.body
    const success = await updateRideToken(rideId, token, res.locals.requestId)
    if (!success) return sendRideFailure(res, "internal_error")
    res.status(200).send({ success })
  }),
)

rideRouter.delete(
  "/",
  bodyValidator(DeleteRideBody),
  createRateLimiter(rideRateLimitWindowMs, 10, (request) => request.body.rideId),
  asyncHandler(async (req, res) => {
    const { rideId } = req.body
    const success = await endRideNotifications(rideId, res.locals.requestId)
    if (!success) return sendRideFailure(res, "internal_error")
    res.status(200).send({ success })
  }),
)

router.use("/ride", rideRouter)
// Fares, from the Israel Railways snapshot `bun run rail:pull` keeps in redis (see routes/fares.ts)
router.use("/fares", faresRouter)
// SIRI pipeline debugging (404s without SIRI_DEBUG_TOKEN — see routes/siri-debug.ts)
router.use("/siri", siriDebugRouter)
// Handle the specific search train request with transformation
router.get(
  "/rail-api/rjpa/api/v1/timetable/searchTrainLuzForDateTime",
  createRateLimiter(10 * 60 * 1000, 1000),
  asyncHandler(handleSearchTrainRequest),
)

// All other rail API paths: timetable searches from GTFS, retired legacy
// endpoints answered with an empty payload (no upstream proxy anymore).
router.use("/rail-api", createRateLimiter(10 * 60 * 1000, 1000), asyncHandler(handleRailApiRequest))

export { router }
