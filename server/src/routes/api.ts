import { Router } from "express"
import { body, validationResult } from "express-validator"

import { addRide } from "../data/redis"
import { endRideNotifications, startRideNotifications, updateRideToken } from "../rides"

const router = Router()

router.post(
  "/startRide",
  body("token").isString(),
  body("locale").isString(),
  body("departureDate").isISO8601(),
  body("originId").isNumeric(),
  body("destinationId").isNumeric(),
  body("trains").isArray(),
  async (req, res) => {
    if (!validationResult(req).isEmpty()) {
      return res.status(400).send("body missing data")
    }

    const ride = await addRide(req.body)
    if (!ride) {
      return res.status(500).send("couldn't start ride")
    }

    const result = await startRideNotifications(ride)
    res.status(result.success ? 200 : 500).json(result)
  },
)

router.post("/updateRideToken", body("rideId").isString(), body("token").isString(), async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).send("body missing data")
  }

  const { rideId, token } = req.body
  const success = await updateRideToken(rideId, token)
  res.status(success ? 200 : 500).send({ success })
})

router.post("/endRide", body("rideId").isString(), async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).send("body missing data")
  }

  const { rideId } = req.body
  const success = await endRideNotifications(rideId)
  res.status(success ? 200 : 500).send({ success })
})

export { router }
