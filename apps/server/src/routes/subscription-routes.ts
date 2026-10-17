/**
 * subscription-routes.ts — PUT / DELETE of a device's push subscription, for the
 * station alerts and Delay Notifications.
 *
 * A PUT replaces the device's whole subscription, so the app sends its full list
 * every time; what the device was told so far is kept for the items that stay.
 * The routers are mounted behind the push-alerts gate and a rate limiter in api.ts.
 */
import { type Request, type Response, Router } from "express"
import type { ZodSchema } from "zod"

import { logger } from "../logs"
import type { SubscriptionStore } from "../utils/subscription-store"
import { bodyValidator } from "./validations"

export type SubscriptionRouterOptions<S extends { token: string; provider: string }, Item, Memory> = {
  subscriptionSchema: ZodSchema<S>
  unsubscribeSchema: ZodSchema<{ token: string }>
  store: SubscriptionStore<S & { updatedAt: string }, Record<string, Memory>>
  /** The subscription's items (stations, guards). */
  itemsOf: (subscription: S) => Item[]
  /** One entry per key: the last choice wins, and memory is kept only for the keys that stay. */
  keyOf: (item: Item) => string
  /** A 400 reason for an item the server cannot serve (an unknown station), or undefined when all are fine. */
  reject: (item: Item) => Record<string, string> | undefined
  withItems: (subscription: S, items: Item[]) => S
  log: { subscribed: string; unsubscribed: string; storeFailed: string }
}

export const createSubscriptionRouter = <S extends { token: string; provider: string }, Item, Memory>(
  options: SubscriptionRouterOptions<S, Item, Memory>,
): Router => {
  const { subscriptionSchema, unsubscribeSchema, store, itemsOf, keyOf, reject, withItems, log } = options

  const subscribe = async (req: Request<unknown, unknown, S>, res: Response) => {
    const body = req.body
    for (const item of itemsOf(body)) {
      const reason = reject(item)
      if (reason) return res.status(400).json({ success: false, ...reason })
    }

    try {
      const byKey = new Map(itemsOf(body).map((item) => [keyOf(item), item]))
      const items = [...byKey.values()]
      await store.writeSubscription({ ...withItems(body, items), updatedAt: new Date().toISOString() })

      // Items no longer asked about are forgotten, so re-adding one later starts it afresh.
      const memory = await store.readMemory(body.token)
      if (memory) {
        const kept = Object.fromEntries(Object.entries(memory).filter(([key]) => byKey.has(key)))
        if (Object.keys(kept).length !== Object.keys(memory).length) await store.writeMemory(body.token, kept)
      }

      logger?.info(log.subscribed, { provider: body.provider, items: items.length })
      return res.status(200).json({ success: true })
    } catch (error) {
      logger?.error(log.storeFailed, { error })
      return res.status(500).json({ success: false })
    }
  }

  const unsubscribe = async (req: Request<unknown, unknown, { token: string }>, res: Response) => {
    try {
      await store.removeSubscription(req.body.token)
      logger?.info(log.unsubscribed)
      return res.status(200).json({ success: true })
    } catch (error) {
      logger?.error(log.storeFailed, { error })
      return res.status(500).json({ success: false })
    }
  }

  const router = Router()
  router.put("/", bodyValidator(subscriptionSchema), subscribe)
  router.delete("/", bodyValidator(unsubscribeSchema), unsubscribe)
  return router
}
