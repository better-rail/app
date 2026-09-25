/**
 * main.ts — standalone entrypoint for the SIRI poller (`bun run siri`).
 *
 * Deployed as its own Railway service so its egress IP can be allow-listed by
 * MOT independently of the web service. It exposes /isAlive and /ready for
 * healthchecks; all state is published to redis, where the web service reads
 * it (searchTrain + the token-guarded /api/v1/siri/* debug routes).
 */
import express from "express"

import { env, port } from "../data/config"
import { applySchema } from "../db"
import { connectToRedis } from "../data/redis"
import { logNames, logger, startLogger } from "../logs"
import { startSiriPoller } from "./poller"
import { initSentry } from "../sentry"
import { asyncHandler, errorHandler, notFoundHandler, requestIdMiddleware, sentryErrorHandler } from "../api-error"
import { metricsMiddleware } from "../metrics"
import { readinessHandler } from "../readiness"

initSentry()

const app = express()
app.use(requestIdMiddleware)
app.use(metricsMiddleware)

app.get("/isAlive", (req, res) => {
  res.status(200).send("SIRI poller is ready! 📡")
})
app.get("/ready", asyncHandler(readinessHandler()))

app.use(notFoundHandler)
app.use(sentryErrorHandler)
app.use(errorHandler)

app.listen(port, async () => {
  startLogger()
  await connectToRedis()

  // Idempotent; guarantees train_platforms exists before the first poll cycle
  // tries to record observed platforms (the poller may deploy before an ingest
  // or web-service start has applied the updated schema).
  try {
    await applySchema()
  } catch (error) {
    logger.error(logNames.db.pool.error, { errorType: error instanceof Error ? error.name : "unknown" })
  }

  startSiriPoller()
  logger.info(logNames.server.listening, { port, env })
})
