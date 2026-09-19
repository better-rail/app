import { Router } from "express"

import { ridesEnabled, stationAlertsEnabled } from "../data/config"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { DelayGuardSubscriptionSchema, DelayGuardUnsubscribeSchema } from "../types/delay-guards"
import { StationAlertSubscriptionSchema, StationAlertUnsubscribeSchema } from "../types/station-alerts"
import { createRateLimiter } from "../utils/rate-limiter"
import { handleRailApiRequest, handleSearchTrainRequest } from "./rail-api"
import { siriDebugRouter } from "./siri-debug"
import { handleServiceStatusRequest } from "./service-status"
import { handleGuardSubscribeRequest, handleGuardUnsubscribeRequest } from "./delay-guards"
import { handleSubscribeRequest, handleUnsubscribeRequest } from "./station-alerts"
import { handleStationDeparturesRequest } from "./station-departures"
import { handleStationInfoRequest } from "./station-info"
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

// Station alerts: a device's stations (and lines) to push about. Closed while the
// alerts are off (a local run, by default — see data/config.ts), like the rides.
const stationAlertsRouter = Router()
stationAlertsRouter.use((req, res, next) => {
  if (!stationAlertsEnabled) return res.status(503).json({ success: false, reason: "station_alerts_disabled" })
  next()
})
stationAlertsRouter.use(createRateLimiter(10 * 60 * 1000, 30))
stationAlertsRouter.put("/", bodyValidator(StationAlertSubscriptionSchema), handleSubscribeRequest)
stationAlertsRouter.delete("/", bodyValidator(StationAlertUnsubscribeSchema), handleUnsubscribeRequest)
router.use("/station-alerts", stationAlertsRouter)

// Delay Guard: the trains a device wants to hear about when they run late. Same gate as the station alerts.
const delayGuardsRouter = Router()
delayGuardsRouter.use((req, res, next) => {
  if (!stationAlertsEnabled) return res.status(503).json({ success: false, reason: "station_alerts_disabled" })
  next()
})
delayGuardsRouter.use(createRateLimiter(10 * 60 * 1000, 30))
delayGuardsRouter.put("/", bodyValidator(DelayGuardSubscriptionSchema), handleGuardSubscribeRequest)
delayGuardsRouter.delete("/", bodyValidator(DelayGuardUnsubscribeSchema), handleGuardUnsubscribeRequest)
router.use("/delay-guards", delayGuardsRouter)
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
