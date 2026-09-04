import express from "express"

import { router } from "./routes/api"
import { applySchema, getActiveFeed } from "./db"
import { env, port, siriPollerMode } from "./data/config"
import { connectToRedis } from "./data/redis"
import { connectToApn } from "./utils/apn-utils"
import { connectToFcm } from "./utils/fcm-utils"
import { logNames, logger, startLogger } from "./logs"
import { startSiriPoller } from "./siri/poller"
import { scheduleExistingRides } from "./utils/ride-utils"

const app = express()
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

  // Ensure the GTFS schema exists (idempotent) and warn if no feed is loaded yet.
  try {
    await applySchema()
    const feed = await getActiveFeed()
    if (!feed) logger.error(logNames.gtfs.noActiveFeed)
  } catch (error) {
    logger.error(logNames.db.pool.error, { error })
  }

  scheduleExistingRides()

  // The SIRI poller normally runs as its own Railway service (`bun run siri`);
  // this fallback hosts it here when the MOT-registered egress IP is ours.
  if (siriPollerMode === "in-process") startSiriPoller()

  logger.info(logNames.server.listening, { port, env })
})
