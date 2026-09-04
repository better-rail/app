/**
 * main.ts — standalone entrypoint for the SIRI poller (`bun run siri`).
 *
 * Deployed as its own Railway service so its egress IP can be allow-listed by
 * MOT independently of the web service. It exposes only /isAlive for
 * healthchecks; all state is published to redis, where the web service reads
 * it (searchTrain + the token-guarded /api/v1/siri/* debug routes).
 */
import express from "express"

import { env, port } from "../data/config"
import { applySchema } from "../db"
import { connectToRedis } from "../data/redis"
import { logNames, logger, startLogger } from "../logs"
import { startSiriPoller } from "./poller"

const app = express()

app.get("/isAlive", (req, res) => {
  res.status(200).send("SIRI poller is ready! 📡")
})

app.listen(port, async () => {
  startLogger()
  await connectToRedis()

  // Idempotent; guarantees train_platforms exists before the first poll cycle
  // tries to record observed platforms (the poller may deploy before an ingest
  // or web-service start has applied the updated schema).
  try {
    await applySchema()
  } catch (error) {
    logger.error(logNames.db.pool.error, { error })
  }

  startSiriPoller()
  logger.info(logNames.server.listening, { port, env })
})
