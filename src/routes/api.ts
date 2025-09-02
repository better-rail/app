import { Router } from "express"

import { railProxy } from "./proxy"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
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
router.use("/rail-api", createRateLimiter(10 * 60 * 1000, 1000), railProxy)

export { router }
