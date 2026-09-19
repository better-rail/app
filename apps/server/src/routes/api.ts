import { type RequestHandler, Router } from "express"

import { ridesEnabled, stationAlertsEnabled } from "../data/config"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
import { handleRailApiRequest, handleSearchTrainRequest } from "./rail-api"
import { siriDebugRouter } from "./siri-debug"
import { handleServiceStatusRequest } from "./service-status"
import { delayGuardsRouter } from "./delay-guards"
import { stationAlertsRouter } from "./station-alerts"
import { handleStationDeparturesRequest } from "./station-departures"
import { handleStationInfoRequest } from "./station-info"
import { DeleteRideBody, UpdateRideTokenBody, bodyValidator } from "./validations"
import { endRideNotifications, startRideNotifications, updateRideToken } from "../rides"

const router = Router()

/** 503 with `reason` while a feature is off (a local run, by default — see data/config.ts). */
const requireEnabled =
  (enabled: boolean, reason: string): RequestHandler =>
  (req, res, next) => {
    if (!enabled) return res.status(503).json({ success: false, reason })
    next()
  }

const rideRouter = Router()
// Every route below reads or writes the shared rides state, so they're closed while ride tracking is off.
rideRouter.use(requireEnabled(ridesEnabled, "rides_disabled"))
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

// Push subscriptions — station alerts (a device's stations and lines) and Delay Guard (the trains it
// wants to hear about when they run late). Both closed while the watchers are off, like the rides.
const pushAlertsGate = requireEnabled(stationAlertsEnabled, "station_alerts_disabled")
router.use("/station-alerts", pushAlertsGate, createRateLimiter(10 * 60 * 1000, 30), stationAlertsRouter)
router.use("/delay-guards", pushAlertsGate, createRateLimiter(10 * 60 * 1000, 30), delayGuardsRouter)
// SIRI pipeline debugging (404s without SIRI_DEBUG_TOKEN — see routes/siri-debug.ts)
router.use("/siri", siriDebugRouter)
// Network health per line (read-only: GTFS timetable + SIRI snapshot)
router.get("/service-status", createRateLimiter(60 * 1000, 60), handleServiceStatusRequest)
// A station's page (entrances and their hours, facilities, notices) from the Israel Railways API, cached
router.get("/stations/:stationId/info", createRateLimiter(60 * 1000, 120), handleStationInfoRequest)
// The next trains calling at a station, per line and direction (GTFS timetable + SIRI snapshot)
router.get("/stations/:stationId/departures", createRateLimiter(60 * 1000, 120), handleStationDeparturesRequest)
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
