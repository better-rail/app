/**
 * devices.ts — `/device`: an anonymous device syncing its state to its Durable Object.
 *
 * The device identifies itself with `X-Device-Id: <uuid>` and `Authorization: Bearer <secret>`. The id never goes
 * in the path or the query string, where request logs and analytics would pick it up. Missing or malformed
 * credentials, an unknown device and a wrong secret all get the same 404 an unknown route gets, so a caller learns
 * nothing about which device ids exist. Nothing here logs the id, the secret or the push tokens.
 */
import { Elysia } from "elysia"

import { DEVICE_ID_HEADER, DeviceIdSchema, DeviceSecretSchema, DeviceStateSchema } from "../types/device"
import { createRateLimiter } from "../utils/rate-limiter"
import { deleteDevice, syncDevice } from "../devices"
import { hashSecret } from "../devices/store"
import { validateBody } from "./validations"
import { json, notFound, rateLimited } from "./helpers"

const deviceRateLimitWindowMs = 10 * 60 * 1000

// Keyed in isolate memory only; the limiter never logs its keys.
// Normalized like readDeviceCredentials, so case or spacing can't split one device into several buckets.
const deviceHeader = (request: { headers: Headers }) => request.headers.get(DEVICE_ID_HEADER)?.trim().toLowerCase()

const perIp = createRateLimiter(deviceRateLimitWindowMs, 1000)
// Only devices with recurring rides sync, and only when their rides or push tokens change; the rest never call here.
const syncLimiter = createRateLimiter(deviceRateLimitWindowMs, 30, deviceHeader)
const deleteLimiter = createRateLimiter(deviceRateLimitWindowMs, 10, deviceHeader)

type DeviceCredentials = { deviceId: string; secret: string }

/** The device id and secret from the headers, or undefined when either is missing or malformed. */
export const readDeviceCredentials = (headers: Headers): DeviceCredentials | undefined => {
  const deviceId = DeviceIdSchema.safeParse(headers.get(DEVICE_ID_HEADER)?.trim().toLowerCase())
  const authorization = headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1]
  const secret = DeviceSecretSchema.safeParse(authorization)
  if (!deviceId.success || !secret.success) return undefined
  return { deviceId: deviceId.data, secret: secret.data }
}

export const deviceRoutes = new Elysia({ prefix: "/device" })
  .onBeforeHandle(rateLimited(perIp))
  // Full-state sync: the device is the source of truth, so its state replaces whatever the object held.
  .put(
    "/",
    async (ctx) => {
      const credentials = readDeviceCredentials(ctx.request.headers)
      if (!credentials) return notFound(ctx)
      const limited = rateLimited(syncLimiter)(ctx)
      if (limited) return limited

      const parsed = validateBody(DeviceStateSchema, ctx.body)
      if ("error" in parsed) return parsed.error

      const result = await syncDevice(credentials.deviceId, await hashSecret(credentials.secret), parsed.data)
      if (result.ok) return json(ctx, result.created ? 201 : 200, { success: true })
      return "error" in result ? json(ctx, 500, { success: false }) : notFound(ctx)
    },
    { parse: "json" },
  )
  // "Delete my data": wipes the device's object.
  .delete("/", async (ctx) => {
    const credentials = readDeviceCredentials(ctx.request.headers)
    if (!credentials) return notFound(ctx)
    const limited = rateLimited(deleteLimiter)(ctx)
    if (limited) return limited

    const deleted = await deleteDevice(credentials.deviceId, await hashSecret(credentials.secret))
    if (deleted === undefined) return json(ctx, 500, { success: false })
    return deleted ? json(ctx, 200, { success: true }) : notFound(ctx)
  })
