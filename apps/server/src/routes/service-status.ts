/**
 * service-status.ts — GET /api/v1/service-status
 *
 * The network's health per line for the app's Service Status screens. Purely a
 * read: the timetable (Postgres, via the planner's cached day loader) laid over
 * with the SIRI snapshot (redis). A database or redis outage degrades to a 503
 * rather than a hang, and the response is short-lived cacheable.
 */
import { Request, Response } from "express"

import { logNames, logger } from "../logs"
import { getServiceStatus } from "../status/service-status"

export const handleServiceStatusRequest = async (_req: Request, res: Response) => {
  try {
    const status = await getServiceStatus()
    if (!status) return res.status(503).json({ error: "Service status unavailable" })
    res.setHeader("Cache-Control", "public, max-age=15")
    return res.status(200).json(status)
  } catch (error) {
    logger?.error(logNames.serviceStatus.failed, { error })
    return res.status(500).json({ error: "Failed to compute service status" })
  }
}
