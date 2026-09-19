/**
 * station-alerts.ts — PUT / DELETE /api/v1/station-alerts
 *
 * A device registers the stations (and lines) it wants pushes about, or
 * unregisters. A PUT replaces the device's whole subscription, so the app
 * sends its full list every time; what the device was told so far is kept
 * for the stations that stay. Closed (503) while station alerts are off, like
 * the ride routes are, so a local run never writes into the shared state.
 */
import { Request, Response } from "express"

import { stationsObject } from "../data/stations"
import { logNames, logger } from "../logs"
import { readMemories, removeSubscription, writeMemory, writeSubscription } from "../station-alerts/store"
import type { StationAlertSubscription } from "../types/station-alerts"

export const handleSubscribeRequest = async (req: Request<unknown, unknown, StationAlertSubscription>, res: Response) => {
  const body = req.body
  const unknown = body.stations.find((c) => !stationsObject[c.stationId])
  if (unknown) return res.status(400).json({ success: false, reason: "unknown_station", stationId: unknown.stationId })

  try {
    // One entry per station: the last choice wins.
    const byStation = new Map(body.stations.map((c) => [c.stationId, c]))
    const stations = [...byStation.values()]
    await writeSubscription({ ...body, stations, updatedAt: new Date().toISOString() })

    // Stations no longer asked about are forgotten, so re-adding one later starts it afresh.
    const memory = (await readMemories()).get(body.token)
    if (memory) {
      const kept = Object.fromEntries(Object.entries(memory).filter(([stationId]) => byStation.has(stationId)))
      if (Object.keys(kept).length !== Object.keys(memory).length) await writeMemory(body.token, kept)
    }

    logger?.info(logNames.stationAlerts.subscribed, { provider: body.provider, stations: stations.length })
    return res.status(200).json({ success: true })
  } catch (error) {
    logger?.error(logNames.stationAlerts.storeFailed, { error })
    return res.status(500).json({ success: false })
  }
}

export const handleUnsubscribeRequest = async (req: Request<unknown, unknown, { token: string }>, res: Response) => {
  try {
    await removeSubscription(req.body.token)
    logger?.info(logNames.stationAlerts.unsubscribed)
    return res.status(200).json({ success: true })
  } catch (error) {
    logger?.error(logNames.stationAlerts.storeFailed, { error })
    return res.status(500).json({ success: false })
  }
}
