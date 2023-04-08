import express from "express"

import { port } from "./data/config"
import { router } from "./routes/api"
import { logNames, logger } from "./logs"
import { connectToRedis } from "./data/redis"
import { scheduleExistingRides } from "./utils/ride-utils"

const app = express()
app.use(express.json())

app.use("/api/v1", router)

app.listen(port, async () => {
  await connectToRedis()
  scheduleExistingRides()
  logger.info(logNames.server.listening, { port })
})
