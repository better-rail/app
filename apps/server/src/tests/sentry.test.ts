import { beforeAll, expect, test } from "bun:test"
import * as Sentry from "@sentry/bun"
import type { Envelope, ErrorEvent } from "@sentry/bun"

import { initSentry, scrubTokens } from "../sentry"
import { logger, startLogger } from "../logs"

const events: ErrorEvent[] = []

beforeAll(() => {
  initSentry({
    dsn: "https://public@o0.ingest.sentry.io/0",
    // Record what would be sent, after beforeSend has scrubbed it.
    transport: () => ({
      send: async (envelope: Envelope) => {
        for (const [header, payload] of envelope[1]) {
          if (header.type === "event") events.push(payload as ErrorEvent)
        }
        return {}
      },
      flush: async () => true,
    }),
  })
  startLogger()
})

const logged = async () => {
  await Sentry.flush(1000)
  return events.splice(0)
}

test("scrubTokens filters token keys and tokens inside logged JSON", () => {
  expect(scrubTokens({ rideId: "r1", token: "abc", payload: { deviceToken: "def", state: 1 } })).toEqual({
    rideId: "r1",
    token: "[Filtered]",
    payload: { deviceToken: "[Filtered]", state: 1 },
  })
  expect(scrubTokens('{"rideId":"r1","token":"abc"}')).toBe('{"rideId":"r1","token":"[Filtered]"}')
})

test("reports logger.error with its error, tags and no push token", async () => {
  logger.error("Failed to schedule ride", {
    error: new Error("redis is down"),
    reason: "internal_error",
    provider: "ios",
    token: "secret-token",
  })

  const [event] = await logged()
  expect(event.exception?.values?.[0]?.value).toBe("redis is down")
  expect(event.fingerprint).toEqual(["Failed to schedule ride", "redis is down"])
  expect(event.tags).toMatchObject({ log: "Failed to schedule ride", ride_start_reason: "internal_error", provider: "ios" })
  // Stack frames carry source lines (this test's literal), not runtime values, so check the rest.
  expect(JSON.stringify({ ...event, exception: undefined })).not.toContain("secret-token")
})

test("reports apns2's plain-object rejection as a message", async () => {
  logger.error("Failed to send Apple notification", {
    error: { reason: "BadDeviceToken", statusCode: 400, notification: { deviceToken: "secret-device" } },
  })

  const [event] = await logged()
  expect(event.message).toBe("Failed to send Apple notification: BadDeviceToken")
  expect(JSON.stringify(event)).not.toContain("secret-device")
})

test("sends a repeated failure once per throttle window, and ignores warnings", async () => {
  logger.error("Failed to update notification id", { error: new Error("timeout") })
  logger.error("Failed to update notification id", { error: new Error("timeout") })
  logger.warn("Ride in the past", { reason: "ride_in_past" })

  expect(await logged()).toHaveLength(1)
})
