/**
 * subscription-routes.ts — PUT / DELETE of a device's push subscription, for the
 * station alerts and Delay Notifications.
 *
 * A PUT replaces the device's whole subscription, so the app sends its full list
 * every time (the alerts object keeps what the device was told for the items
 * that stay). Both routes are closed while the watchers are off, like the rides,
 * and devices sharing a carrier IP get a loose shared bucket and a tight one
 * each, keyed by their push token.
 */
import { Elysia } from "elysia"
import type { ZodSchema } from "zod"

import { config } from "../config"
import { logger } from "../logs"
import { createRateLimiter } from "../utils/rate-limiter"
import { json, rateLimited } from "./helpers"
import { validateBody } from "./validations"

export type SubscriptionRoutesOptions<S extends { token: string; provider: string }, Item> = {
  /** The mount path, e.g. "/station-alerts". */
  prefix: string
  subscriptionSchema: ZodSchema<S>
  unsubscribeSchema: ZodSchema<{ token: string }>
  /** The subscription's items (stations, guards). */
  itemsOf: (subscription: S) => Item[]
  /** A 400 reason for an item the server cannot serve (an unknown station), or undefined when all are fine. */
  reject: (item: Item) => Record<string, string> | undefined
  subscribe: (subscription: S) => Promise<void>
  unsubscribe: (token: string) => Promise<void>
  log: { storeFailed: string }
}

const windowMs = 10 * 60 * 1000
const tokenOf = (request: { body?: unknown }) => {
  const token = (request.body as { token?: unknown } | undefined)?.token
  return typeof token === "string" ? token : undefined
}

export const createSubscriptionRoutes = <S extends { token: string; provider: string }, Item>(
  options: SubscriptionRoutesOptions<S, Item>,
) => {
  const { prefix, subscriptionSchema, unsubscribeSchema, itemsOf, reject, subscribe, unsubscribe, log } = options
  const perIp = createRateLimiter(windowMs, 1000)
  const perToken = createRateLimiter(windowMs, 30, tokenOf)

  return new Elysia({ prefix })
    .onBeforeHandle((ctx) => {
      if (!config.stationAlertsEnabled) return json(ctx, 503, { success: false, reason: "station_alerts_disabled" })
      return rateLimited(perIp)(ctx)
    })
    .put(
      "/",
      async (ctx) => {
        const parsed = validateBody(subscriptionSchema, ctx.body)
        if ("error" in parsed) return parsed.error
        const limited = rateLimited(perToken)({ ...ctx, body: parsed.data })
        if (limited) return limited

        for (const item of itemsOf(parsed.data)) {
          const reason = reject(item)
          if (reason) return json(ctx, 400, { success: false, ...reason })
        }
        try {
          await subscribe(parsed.data)
          return { success: true }
        } catch (error) {
          logger.error(log.storeFailed, { error })
          return json(ctx, 500, { success: false })
        }
      },
      { parse: "json" },
    )
    .delete(
      "/",
      async (ctx) => {
        const parsed = validateBody(unsubscribeSchema, ctx.body)
        if ("error" in parsed) return parsed.error
        const limited = rateLimited(perToken)({ ...ctx, body: parsed.data })
        if (limited) return limited

        try {
          await unsubscribe(parsed.data.token)
          return { success: true }
        } catch (error) {
          logger.error(log.storeFailed, { error })
          return json(ctx, 500, { success: false })
        }
      },
      { parse: "json" },
    )
}
