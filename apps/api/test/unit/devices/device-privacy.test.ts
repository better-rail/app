/**
 * A device's id, secret and push tokens must never be printed to the server logs (Workers Logs keep everything
 * `console` prints) nor reach Sentry, wherever they sit in a log's metadata.
 */
import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test"
import * as Sentry from "@sentry/cloudflare"

import { logger } from "../../../src/logs"
import { resetThrottle, scrubEvent, scrubTokens } from "../../../src/sentry"
import { randomSecret } from "./fixtures"

const deviceId = crypto.randomUUID()
const secret = randomSecret()
const pushToStart = "push-to-start-0123456789abcdef"
const apns = "apns-0123456789abcdef"
const fcm = "fcm-0123456789abcdef"
const SENSITIVE = [deviceId, secret, pushToStart, apns, fcm]

const expectClean = (payload: unknown) => {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload)
  for (const value of SENSITIVE) expect(text).not.toContain(value)
}

// The ways a careless log call could carry a device's credentials.
const leakyMetadata = {
  deviceId,
  device_id: deviceId,
  "x-device-id": deviceId,
  secret,
  authorization: `Bearer ${secret}`,
  tokens: { pushToStart, apns, fcm },
  device: { deviceId, secret, tokens: { pushToStart, apns, fcm } },
  body: JSON.stringify({ deviceId, secret, tokens: { pushToStart } }),
  headers: [["Authorization", `Bearer ${secret}`]],
  error: new Error(`sync failed for {"deviceId":"${deviceId}"} with Bearer ${secret}`),
}

type Captured = { value: unknown; context: unknown }
const captured: Captured[] = []
const printed: unknown[][] = []

beforeEach(() => {
  resetThrottle()
  captured.length = 0
  printed.length = 0
  mock.module("@sentry/cloudflare", () => ({
    ...Sentry,
    captureException: (value: unknown, context: unknown) => captured.push({ value, context }),
    captureMessage: (value: unknown, context: unknown) => captured.push({ value, context }),
  }))
  for (const method of ["log", "warn", "error"] as const) {
    spyOn(console, method).mockImplementation((...args: unknown[]) => void printed.push(args))
  }
})

afterEach(() => {
  mock.restore()
})

test("the logger never prints a device's id, secret or push tokens", () => {
  logger.info("device synced", leakyMetadata)
  logger.warn("device sync slow", leakyMetadata)
  logger.child({ deviceId, secret }).error("device sync failed", leakyMetadata)
  logger.info(`device ${JSON.stringify({ deviceId })} with Bearer ${secret}`)

  expect(printed.length).toBe(4)
  expectClean(printed)
  // Still useful: the message and the error's cause survive.
  expect(String(printed[2][0])).toContain("device sync failed")
  expect(String(printed[2][0])).toContain("sync failed for")
})

test("Sentry never receives a device's id, secret or push tokens", () => {
  logger.error("device sync failed", leakyMetadata)
  expect(captured.length).toBe(1)

  const { value, context } = captured[0] as { value: Error; context: { extra: unknown; tags: unknown } }
  // What beforeSend hands Sentry: the event built from the captured error and its context.
  const event = scrubEvent({
    message: value.message,
    exception: { values: [{ type: value.name, value: value.message }] },
    extra: context.extra as Record<string, unknown>,
    contexts: { device: { deviceId, secret } },
    request: { headers: { "x-device-id": deviceId, authorization: `Bearer ${secret}` } },
  } as never)
  expectClean(event)
  expectClean(context.tags)
})

test("scrubTokens filters device credentials and still filters ride push tokens", () => {
  expectClean(scrubTokens(leakyMetadata))
  expect(scrubTokens({ rideId: "r1", token: "abc" })).toEqual({ rideId: "r1", token: "[Filtered]" })
})
