import * as Sentry from "@sentry/bun"
import Transport from "winston-transport"
import type { Breadcrumb, ErrorEvent } from "@sentry/bun"

import { env } from "./data/config"

// Push tokens ride along in ride metadata, notification payloads and APNs errors.
const TOKEN_KEY = /token/i
const TOKEN_IN_TEXT = /("[^"]*token[^"]*"\s*:\s*)"[^"]*"/gi
const FILTERED = "[Filtered]"

export const scrubTokens = (value: unknown, depth = 0): unknown => {
  if (typeof value === "string") return value.replace(TOKEN_IN_TEXT, `$1"${FILTERED}"`)
  if (value === null || typeof value !== "object" || depth > 8) return value
  if (Array.isArray(value)) return value.map((item) => scrubTokens(item, depth + 1))

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, TOKEN_KEY.test(key) ? FILTERED : scrubTokens(item, depth + 1)]),
  )
}

const scrubEvent = (event: ErrorEvent) => {
  // Bun breaks the SDK's per-request isolation: every event, even from background jobs, carries the first request since boot.
  delete event.request
  if (event.extra) event.extra = scrubTokens(event.extra) as ErrorEvent["extra"]
  if (event.contexts) event.contexts = scrubTokens(event.contexts) as ErrorEvent["contexts"]
  return event
}

const scrubBreadcrumb = (breadcrumb: Breadcrumb) => {
  // Outgoing request queries can carry credentials (SIRI takes its key as `?Key=`), so keep only the path.
  if (breadcrumb.data) {
    delete breadcrumb.data["http.query"]
    delete breadcrumb.data["http.fragment"]
    if (typeof breadcrumb.data.url === "string") breadcrumb.data.url = breadcrumb.data.url.split(/[?#]/)[0]
  }

  return scrubTokens(breadcrumb) as Breadcrumb
}

/** Reads SENTRY_DSN, so it stays off locally. Tracing stays off: spans would carry push tokens unscrubbed. */
export const initSentry = (options: Parameters<typeof Sentry.init>[0] = {}) => {
  Sentry.init({
    environment: env,
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
    ...options,
  })
}

// Every ride logs its failures once a minute, so one broken dependency would otherwise flood the org's error quota.
const THROTTLE_MS = 10 * 60 * 1000
const lastSent = new Map<string, number>()

const shouldSend = (key: string) => {
  const now = Date.now()
  if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return false
  if (lastSent.size > 500) lastSent.clear()
  lastSent.set(key, now)
  return true
}

// apns2 rejects with a plain `{ reason, statusCode }` object rather than an Error.
const SAFE_REASONS = new Set([
  "BadDeviceToken",
  "DeviceTokenNotForTopic",
  "Unregistered",
  "messaging/registration-token-not-registered",
  "internal_error",
  "timetable_unavailable",
  "route_not_found",
  "ride_in_past",
  "ride_in_future",
  "rides_disabled",
  "route_lookup_failed",
])
const safeReason = (value: unknown) => (typeof value === "string" && SAFE_REASONS.has(value) ? value : "provider_error")

const describeError = (error: unknown) => {
  if (error instanceof Error) return /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(error.name) ? error.name : "Error"
  if (error && typeof error === "object" && "reason" in error) return safeReason((error as { reason: unknown }).reason)
  return "UnknownError"
}

/** Reports `logger.error` calls to Sentry, so existing call sites need no changes. */
export class SentryTransport extends Transport {
  constructor() {
    super({ level: "error" })
  }

  log(info: { message: string; metadata?: Record<string, unknown> }, callback: () => void) {
    const { error, ...extra } = info.metadata ?? {}
    const errorDescription = describeError(error)
    // Bun drops async callers from stacks, so group by log site and failure instead of by the throw site.
    const fingerprint = [info.message, errorDescription]

    if (shouldSend(fingerprint.join("|"))) {
      const context = {
        fingerprint,
        tags: {
          log: info.message,
          ...(typeof extra.reason === "string" && { ride_start_reason: safeReason(extra.reason) }),
          ...(typeof extra.provider === "string" && { provider: extra.provider }),
        },
        extra: scrubTokens({ ...extra, ...(error !== undefined && { errorType: errorDescription }) }) as ErrorEvent["extra"],
      }

      if (error instanceof Error) Sentry.captureException(new Error(errorDescription), context)
      else
        Sentry.captureMessage(errorDescription ? `${info.message}: ${errorDescription}` : info.message, {
          ...context,
          level: "error",
        })
    }

    callback()
  }
}
