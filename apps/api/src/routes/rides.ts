import { Elysia } from "elysia"

import { config } from "../config"
import { buildRide } from "../utils/ride-utils"
import { RideRequestSchema } from "../types/ride"
import { createRateLimiter } from "../utils/rate-limiter"
import { DeleteRideBody, RemoveRideAlarmBody, SetRideAlarmBody, UpdateRideTokenBody, validateBody } from "./validations"
import { endRideNotifications, removeRideAlarm, setRideAlarm, startRideNotifications, updateRideToken } from "../rides"
import { json, rateLimited } from "./helpers"

const rideRateLimitWindowMs = 10 * 60 * 1000
const field = (name: string) => (request: { body?: unknown }) => {
  const value = (request.body as Record<string, unknown> | undefined)?.[name]
  return typeof value === "string" ? value : undefined
}

// Separate devices sharing a mobile carrier IP into independent buckets.
const perIp = createRateLimiter(rideRateLimitWindowMs, 1000)
const startLimiter = createRateLimiter(rideRateLimitWindowMs, 10, field("token"))
const tokenLimiter = createRateLimiter(rideRateLimitWindowMs, 10, field("rideId"))
const deleteLimiter = createRateLimiter(rideRateLimitWindowMs, 10, field("rideId"))
// The app re-sends the alarm whenever it comes to the foreground, so allow more than the other ride routes.
const setAlarmLimiter = createRateLimiter(rideRateLimitWindowMs, 30, field("rideId"))
const removeAlarmLimiter = createRateLimiter(rideRateLimitWindowMs, 30, field("rideId"))

export const rideRoutes = new Elysia({ prefix: "/ride" })
  // Every route below reads or writes the rides' state, so they're closed while ride tracking is off.
  .onBeforeHandle((ctx) => {
    if (!config.ridesEnabled) return json(ctx, 503, { success: false, reason: "rides_disabled" })
    return rateLimited(perIp)(ctx)
  })
  .post(
    "/",
    async (ctx) => {
      const parsed = validateBody(RideRequestSchema, ctx.body)
      if ("error" in parsed) return parsed.error
      const limited = rateLimited(startLimiter)({ ...ctx, body: parsed.data })
      if (limited) return limited

      const ride = buildRide(parsed.data)
      const result = await startRideNotifications(ride)
      return json(ctx, result.success ? 200 : 500, result)
    },
    { parse: "json" },
  )
  .patch(
    "/updateToken",
    async (ctx) => {
      const parsed = validateBody(UpdateRideTokenBody, ctx.body)
      if ("error" in parsed) return parsed.error
      const limited = rateLimited(tokenLimiter)({ ...ctx, body: parsed.data })
      if (limited) return limited

      const { rideId, token } = parsed.data
      const success = await updateRideToken(rideId, token)
      return json(ctx, success ? 200 : 500, { success })
    },
    { parse: "json" },
  )
  .delete(
    "/",
    async (ctx) => {
      const parsed = validateBody(DeleteRideBody, ctx.body)
      if ("error" in parsed) return parsed.error
      const limited = rateLimited(deleteLimiter)({ ...ctx, body: parsed.data })
      if (limited) return limited

      const success = await endRideNotifications(parsed.data.rideId)
      return json(ctx, success ? 200 : 500, { success })
    },
    { parse: "json" },
  )
  .put(
    "/alarm",
    async (ctx) => {
      const parsed = validateBody(SetRideAlarmBody, ctx.body)
      if ("error" in parsed) return parsed.error
      const limited = rateLimited(setAlarmLimiter)({ ...ctx, body: parsed.data })
      if (limited) return limited

      const { rideId, ...alarm } = parsed.data
      const stops = await setRideAlarm(rideId, alarm)
      return json(ctx, stops ? 200 : 404, { success: Boolean(stops), stops })
    },
    { parse: "json" },
  )
  .delete(
    "/alarm",
    async (ctx) => {
      const parsed = validateBody(RemoveRideAlarmBody, ctx.body)
      if ("error" in parsed) return parsed.error
      const limited = rateLimited(removeAlarmLimiter)({ ...ctx, body: parsed.data })
      if (limited) return limited

      const success = await removeRideAlarm(parsed.data.rideId)
      return json(ctx, success ? 200 : 500, { success })
    },
    { parse: "json" },
  )
