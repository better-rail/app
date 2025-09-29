import { Router } from "express"

import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
import { railProxy, handleSearchTrainRequest } from "./proxy"
import { DeleteRideBody, UpdateRideTokenBody, bodyValidator } from "./validations"
import { endRideNotifications, startRideNotifications, updateRideToken } from "../rides"

const router = Router()

const rideRouter = Router()
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
// Handle the specific search train request with transformation
router.get(
  "/rail-api/rjpa/api/v1/timetable/searchTrainLuzForDateTime",
  createRateLimiter(10 * 60 * 1000, 1000),
  handleSearchTrainRequest,
)

// Use proxy for all other rail API requests
router.use("/rail-api", createRateLimiter(10 * 60 * 1000, 1000), railProxy)

export { router }
