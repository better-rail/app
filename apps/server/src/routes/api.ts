import { Router } from "express"

import { ridesEnabled } from "../data/config"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
import { handleRailApiRequest, handleSearchTrainRequest } from "./rail-api"
import { faresRouter } from "./fares"
import { siriDebugRouter } from "./siri-debug"
import { DeleteRideBody, UpdateRideTokenBody, bodyValidator } from "./validations"
import { endRideNotifications, startRideNotifications, updateRideToken } from "../rides"

const router = Router()

const rideRouter = Router()
// Every route below reads or writes the shared rides state, so they're closed
// while ride tracking is off (a local run, by default — see data/config.ts).
rideRouter.use((req, res, next) => {
  if (!ridesEnabled) return res.status(503).json({ success: false, reason: "rides_disabled" })
  next()
})
rideRouter.use(createRateLimiter(10 * 60 * 1000, 10))

rideRouter.post("/", bodyValidator(RideRequestSchema), async (req, res) => {
  const ride = buildRide(req.body)
  const result = await startRideNotifications(ride)
  res.status(result.success ? 200 : 500).json(result)
})

rideRouter.patch("/updateToken", bodyValidator(UpdateRideTokenBody), async (req, res) => {
  const { rideId, token } = req.body
  const success = await updateRideToken(rideId, token)
  res.status(success ? 200 : 500).send({ success })
})

rideRouter.delete("/", bodyValidator(DeleteRideBody), async (req, res) => {
  const { rideId } = req.body
  const success = await endRideNotifications(rideId)
  res.status(success ? 200 : 500).send({ success })
})

router.use("/ride", rideRouter)
// Fares, from the Israel Railways snapshot `bun run rail:pull` keeps in redis (see routes/fares.ts)
router.use("/fares", faresRouter)
// SIRI pipeline debugging (404s without SIRI_DEBUG_TOKEN — see routes/siri-debug.ts)
router.use("/siri", siriDebugRouter)
// Handle the specific search train request with transformation
router.get(
  "/rail-api/rjpa/api/v1/timetable/searchTrainLuzForDateTime",
  createRateLimiter(10 * 60 * 1000, 1000),
  handleSearchTrainRequest,
)

// All other rail API paths: timetable searches from GTFS, retired legacy
// endpoints answered with an empty payload (no upstream proxy anymore).
router.use("/rail-api", createRateLimiter(10 * 60 * 1000, 1000), handleRailApiRequest)

export { router }
