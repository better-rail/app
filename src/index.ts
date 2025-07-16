import express from "express"
import rateLimit from "express-rate-limit"

import { router } from "./routes/api"
import { env, port } from "./data/config"
import { connectToRedis } from "./data/redis"
import { connectToApn } from "./utils/apn-utils"
import { connectToFcm } from "./utils/fcm-utils"
import { logNames, logger, startLogger } from "./logs"
import { scheduleExistingRides } from "./utils/ride-utils"

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env !== "production",
  keyGenerator: (req) =>
    (Array.isArray(req.headers["cf-connecting-ip"]) ? req.headers["cf-connecting-ip"][0] : req.headers["cf-connecting-ip"]) ||
    (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) ||
    req.ip,
})

const app = express()
app.use(limiter)
app.use(express.json())

app.use("/api/v1", router)

app.get("/isAlive", (req, res) => {
  res.status(200).send("App is ready! 🚂")
})

app.listen(port, async () => {
  startLogger()
  await connectToRedis()
  connectToApn()
  connectToFcm()
  scheduleExistingRides()
  logger.info(logNames.server.listening, { port, env })
})
