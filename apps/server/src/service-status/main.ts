/**
 * main.ts — standalone entrypoint for the service-status service (`bun run service-status`).
 *
 * Deployed as its own Railway service, like the SIRI poller. Every few minutes it
 * gathers what the live feed cannot tell about the network's health and publishes
 * it to redis, where the web service lays it over the status (status/service-status.ts):
 *
 * - announcements.ts: Israel Railways' published service updates, read into planned
 *   disruptions by an OpenAI model whenever they change;
 * - timetable.ts: Israel Railways' own timetable compared with the GTFS schedule, for
 *   trains that have gone missing (cancelled), lost stops or gained a run.
 *
 * It exposes only /isAlive for healthchecks.
 */
import express from "express"

import { env, port } from "../data/config"
import { connectToRedis } from "../data/redis"
import { logNames, logger, startLogger } from "../logs"
import { startAnnouncementsPoller } from "./announcements"
import { startTimetableCheck } from "./timetable"

const app = express()

app.get("/isAlive", (req, res) => {
  res.status(200).send("Service-status service is ready! 🚦")
})

app.listen(port, async () => {
  startLogger()
  await connectToRedis()
  startAnnouncementsPoller()
  startTimetableCheck()
  logger.info(logNames.server.listening, { port, env })
})
