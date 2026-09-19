/**
 * delay-guards.ts — PUT / DELETE /api/v1/delay-guards
 *
 * A device registers the trains it guards, or unregisters. A PUT replaces the
 * device's whole list; what it was told today is kept for the guards that stay.
 * Closed (503) while push alerts are off, like the station alerts.
 */
import { Request, Response } from "express"

import { stationsObject } from "../data/stations"
import { logNames, logger } from "../logs"
import { readGuardMemories, removeGuardSubscription, writeGuardMemory, writeGuardSubscription } from "../delay-guards/store"
import { type DelayGuardSubscription, guardKey } from "../types/delay-guards"

export const handleGuardSubscribeRequest = async (req: Request<unknown, unknown, DelayGuardSubscription>, res: Response) => {
  const body = req.body
  const unknown = body.guards.find((g) => !stationsObject[g.originStationId] || !stationsObject[g.destinationStationId])
  if (unknown) return res.status(400).json({ success: false, reason: "unknown_station" })

  try {
    const byKey = new Map(body.guards.map((g) => [guardKey(g), g]))
    const guards = [...byKey.values()]
    await writeGuardSubscription({ ...body, guards, updatedAt: new Date().toISOString() })

    const memory = (await readGuardMemories()).get(body.token)
    if (memory) {
      const kept = Object.fromEntries(Object.entries(memory).filter(([key]) => byKey.has(key)))
      if (Object.keys(kept).length !== Object.keys(memory).length) await writeGuardMemory(body.token, kept)
    }

    logger?.info(logNames.delayGuards.subscribed, { provider: body.provider, guards: guards.length })
    return res.status(200).json({ success: true })
  } catch (error) {
    logger?.error(logNames.delayGuards.storeFailed, { error })
    return res.status(500).json({ success: false })
  }
}

export const handleGuardUnsubscribeRequest = async (req: Request<unknown, unknown, { token: string }>, res: Response) => {
  try {
    await removeGuardSubscription(req.body.token)
    logger?.info(logNames.delayGuards.unsubscribed)
    return res.status(200).json({ success: true })
  } catch (error) {
    logger?.error(logNames.delayGuards.storeFailed, { error })
    return res.status(500).json({ success: false })
  }
}
