import { Router } from "express"
import { body, validationResult } from "express-validator"

import { addRide, deleteRide } from "../data/redis"
import { endRideNotifications, startRideNotifications } from "../rides/rides"

const router = Router()

router.post(
  "/startRide",
  body("token").isString(),
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

    const success = await startRideNotifications(ride)
    res.status(success ? 200 : 500).send({ success })
  },
)

router.post("/endRide", body("token").isString(), async (req, res) => {
  if (!validationResult(req).isEmpty()) {
    return res.status(400).send("body missing data")
  }

  const token = req.body.token
  const success = (await deleteRide(token)) && endRideNotifications(token)
  res.status(success ? 200 : 500).send({ success })
})

export { router }
