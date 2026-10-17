/**
 * station-departures.ts — GET /api/v1/stations/:stationId/departures
 *
 * The next trains calling at a station, per line and direction, from the GTFS
 * timetable laid over with the SIRI snapshot (status/departures.ts). Short-lived
 * cacheable; 404 for a station the catalogue does not know, 503 with no feed.
 */
import { Request, Response } from "express"

import { stationsObject } from "../data/stations"
import { logNames, logger } from "../logs"
import { getStationDepartures } from "../status/departures"

export const handleStationDeparturesRequest = async (req: Request, res: Response) => {
  const stationId = String(req.params.stationId ?? "")
  if (!stationsObject[stationId]) return res.status(404).json({ error: "Unknown station" })
  try {
    const departures = await getStationDepartures(stationId)
    if (!departures) return res.status(503).json({ error: "Departures unavailable" })
    res.setHeader("Cache-Control", "public, max-age=10")
    return res.status(200).json(departures)
  } catch (error) {
    logger?.error(logNames.stationDepartures.failed, { stationId, error })
    return res.status(500).json({ error: "Failed to compute departures" })
  }
}
