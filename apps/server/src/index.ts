import express from "express"

import { initSentry } from "./sentry"
import { router } from "./routes/api"
import { applySchema, getActiveFeed } from "./db"
import { isRailApiConfigured } from "./requests/rail-api"
import { env, port, railDataSource, ridesEnabled, siriPollerMode } from "./data/config"
import { connectToRedis } from "./data/redis"
import { connectToApn } from "./utils/apn-utils"
import { connectToFcm } from "./utils/fcm-utils"
import { logNames, logger, startLogger } from "./logs"
import { startSiriPoller } from "./siri/poller"
import { scheduleExistingRides } from "./utils/ride-utils"
import { asyncHandler, errorHandler, notFoundHandler, requestIdMiddleware, sentryErrorHandler } from "./api-error"
import { metricsMiddleware } from "./metrics"
import { readinessHandler, type ReadinessDependencies } from "./readiness"

export const createApp = (readinessDependencies?: ReadinessDependencies) => {
  const app = express()
  app.use(requestIdMiddleware)
  app.use(metricsMiddleware)
  app.use(express.json())

  app.use("/api/v1", router)

  app.get("/isAlive", (_req, res) => {
    res.status(200).send("App is ready! 🚂")
  })
  app.get("/ready", asyncHandler(readinessHandler(readinessDependencies)))

  app.use(notFoundHandler)
  app.use(sentryErrorHandler)
  app.use(errorHandler)
  return app
}

export const startServer = () => {
  initSentry()
  const app = createApp()

  app.listen(port, async () => {
    startLogger()
    await connectToRedis()
    connectToApn()
    connectToFcm()

    logger.info(logNames.server.dataSource, { source: railDataSource })
    if (railDataSource === "rail" && !isRailApiConfigured()) logger.error(logNames.railApi.notConfigured)

    if (railDataSource === "gtfs") {
      try {
        await applySchema()
        const feed = await getActiveFeed()
        if (!feed) logger.error(logNames.gtfs.noActiveFeed)
      } catch (error) {
        logger.error(logNames.db.pool.error, { errorType: error instanceof Error ? error.name : "unknown" })
      }
    }

    if (ridesEnabled) scheduleExistingRides()
    else logger.warn(logNames.server.ridesDisabled)

    if (siriPollerMode === "in-process") startSiriPoller()

    logger.info(logNames.server.listening, { port, env })
  })
}

if (require.main === module) startServer()
