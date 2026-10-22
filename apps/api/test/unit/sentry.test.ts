import { afterEach, beforeEach, expect, mock, test } from "bun:test"
import * as Sentry from "@sentry/cloudflare"

import {
  describeError,
  reportError,
  resetThrottle,
  scrubBreadcrumb,
  scrubEvent,
  scrubTokens,
  sentryOptions,
} from "../../src/sentry"

type Captured = { kind: "exception" | "message"; value: unknown; context: any }
const captured: Captured[] = []

beforeEach(() => {
  resetThrottle()
  captured.length = 0
  // No client is initialized in unit tests; capture what the logger would hand Sentry.
  mock.module("@sentry/cloudflare", () => ({
    ...Sentry,
    captureException: (value: unknown, context: unknown) => captured.push({ kind: "exception", value, context }),
    captureMessage: (value: unknown, context: unknown) => captured.push({ kind: "message", value, context }),
  }))
})

afterEach(() => {
  mock.restore()
})

test("scrubTokens filters token keys and tokens inside logged JSON", () => {
  expect(scrubTokens({ rideId: "r1", token: "abc", payload: { deviceToken: "def", state: 1 } })).toEqual({
    rideId: "r1",
    token: "[Filtered]",
    payload: { deviceToken: "[Filtered]", state: 1 },
  })
  expect(scrubTokens('{"rideId":"r1","token":"abc"}')).toBe('{"rideId":"r1","token":"[Filtered]"}')
})

test("scrubEvent drops the request and scrubs extra + contexts", () => {
  const event = scrubEvent({
    request: { url: "https://api/x?x-debug-token=1" },
    extra: { token: "t", rideId: "r" },
    contexts: { ride: { deviceToken: "d" } },
  } as any)
  expect(event.request).toBeUndefined()
  expect(event.extra).toEqual({ token: "[Filtered]", rideId: "r" })
  expect(event.contexts).toEqual({ ride: { deviceToken: "[Filtered]" } })
})

test("drops query strings from outgoing request breadcrumbs", () => {
  const breadcrumb = scrubBreadcrumb({
    category: "http",
    data: { url: "https://siri.example/json?Key=SECRETKEY&MonitoringRef=1", "http.query": "?Key=SECRETKEY" },
  })
  expect(breadcrumb.data).toEqual({ url: "https://siri.example/json" })
})

test("reports logger.error with its error, tags and no push token", () => {
  reportError("Failed to schedule ride", {
    error: new Error("D1 is down"),
    reason: "internal_error",
    provider: "ios",
    token: "secret-token",
  })

  const [event] = captured
  expect(event.kind).toBe("exception")
  expect((event.value as Error).message).toBe("D1 is down")
  expect(event.context.fingerprint).toEqual(["Failed to schedule ride", "D1 is down"])
  expect(event.context.tags).toMatchObject({
    log: "Failed to schedule ride",
    ride_start_reason: "internal_error",
    provider: "ios",
  })
  // The extra is scrubbed by beforeSend; what matters here is the shape handed over.
  expect(scrubTokens(event.context.extra)).toEqual({ reason: "internal_error", provider: "ios", token: "[Filtered]" })
})

test("reports the APNs client's plain-object rejection as a message", () => {
  reportError("Failed to send Apple notification", {
    error: { reason: "BadDeviceToken", statusCode: 400, notification: { deviceToken: "secret-device" } },
  })

  const [event] = captured
  expect(event.kind).toBe("message")
  expect(event.value).toBe("Failed to send Apple notification: BadDeviceToken")
  expect(JSON.stringify(scrubTokens(event.context))).not.toContain("secret-device")
})

test("sends a repeated failure once per throttle window", () => {
  reportError("Failed to update notification id", { error: new Error("timeout") })
  reportError("Failed to update notification id", { error: new Error("timeout") })
  reportError("Failed to update notification id", { error: new Error("other") })

  expect(captured).toHaveLength(2)
})

test("describeError reads Errors, apns-style objects and plain values", () => {
  expect(describeError(new Error("x"))).toBe("x")
  expect(describeError({ reason: "Unregistered" })).toBe("Unregistered")
  expect(describeError(undefined)).toBe("")
  expect(describeError(42)).toBe("42")
})

test("sentryOptions reads the DSN and environment from the bindings", () => {
  const options = sentryOptions({ SENTRY_DSN: "https://public@o0.ingest.sentry.io/0", NODE_ENV: "production" })
  expect(options.dsn).toBe("https://public@o0.ingest.sentry.io/0")
  expect(options.environment).toBe("production")
  expect(options.tracesSampleRate).toBe(0)
  expect(sentryOptions({}).dsn).toBeUndefined()
})
