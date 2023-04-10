import express from "express"

import { router } from "./routes/api"
import { env, port } from "./data/config"
import { logNames, logger } from "./logs"
import { connectToRedis } from "./data/redis"
import { scheduleExistingRides } from "./utils/ride-utils"

const app = express()
app.use(express.json())

app.use("/api/v1", router)

app.listen(port, async () => {
  await connectToRedis()
  scheduleExistingRides()
  logger.info(logNames.server.listening, { port, env })
})
