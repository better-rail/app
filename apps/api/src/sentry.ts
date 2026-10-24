/**
 * sentry.ts — error reporting on Workers (@sentry/cloudflare).
 *
 * The fetch/cron handlers are wrapped with `withSentry` and each Durable Object
 * with `instrumentDurableObjectWithSentry` (see index.ts); both read SENTRY_DSN
 * from the bindings, so it stays off locally and in tests. `reportError` is what
 * the logger calls for every `logger.error`, throttled per log site so a ride
 * that fails once a minute doesn't flood the org's quota. Tracing stays off:
 * spans would carry push tokens unscrubbed.
 */
import * as Sentry from "@sentry/cloudflare"
import type { Breadcrumb, ErrorEvent } from "@sentry/cloudflare"

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

export const scrubEvent = (event: ErrorEvent) => {
  // The request (URL + headers) can carry the SIRI debug token; the log metadata is what matters.
  delete event.request
  if (event.extra) event.extra = scrubTokens(event.extra) as ErrorEvent["extra"]
  if (event.contexts) event.contexts = scrubTokens(event.contexts) as ErrorEvent["contexts"]
  return event
}

export const scrubBreadcrumb = (breadcrumb: Breadcrumb) => {
  // Outgoing request queries can carry credentials (SIRI takes its key as `?Key=`), so keep only the path.
  if (breadcrumb.data) {
    delete breadcrumb.data["http.query"]
    delete breadcrumb.data["http.fragment"]
    if (typeof breadcrumb.data.url === "string") breadcrumb.data.url = breadcrumb.data.url.split(/[?#]/)[0]
  }

  return scrubTokens(breadcrumb) as Breadcrumb
}

/** Sentry options for `withSentry` / `instrumentDurableObjectWithSentry`; an empty DSN disables the SDK. */
export const sentryOptions = (env: Record<string, unknown>): Sentry.CloudflareOptions => ({
  dsn: typeof env.SENTRY_DSN === "string" ? env.SENTRY_DSN : undefined,
  environment: typeof env.NODE_ENV === "string" ? env.NODE_ENV : "test",
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
  beforeBreadcrumb: scrubBreadcrumb,
})

// Every ride logs its failures once a minute, so one broken dependency would otherwise flood the org's error quota.
const THROTTLE_MS = 10 * 60 * 1000
const lastSent = new Map<string, number>()

export const shouldSend = (key: string, now = Date.now()) => {
  if (now - (lastSent.get(key) ?? 0) < THROTTLE_MS) return false
  if (lastSent.size > 500) lastSent.clear()
  lastSent.set(key, now)
  return true
}

/** Tests: forget the throttle state. */
export const resetThrottle = () => lastSent.clear()

// The APNs client rejects with a plain `{ reason, statusCode }` object rather than an Error, like apns2 did.
export const describeError = (error: unknown) => {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "reason" in error) return String((error as { reason: unknown }).reason)
  return error === undefined ? "" : String(error)
}

/** Reports a `logger.error` call to Sentry (no-op without a client, e.g. in unit tests). */
export const reportError = (message: string, metadata: Record<string, unknown> = {}) => {
  const { error, ...extra } = metadata
  const errorDescription = describeError(error)
  // Group by log site and failure instead of by the throw site, whose stacks vary across isolates.
  const fingerprint = [message, errorDescription]
  if (!shouldSend(fingerprint.join("|"))) return

  const context = {
    fingerprint,
    tags: {
      log: message,
      ...(typeof extra.reason === "string" && { ride_start_reason: extra.reason }),
      ...(typeof extra.provider === "string" && { provider: extra.provider }),
    },
    extra: { ...extra, ...(error !== undefined && !(error instanceof Error) && { error }) },
  }

  try {
    if (error instanceof Error) Sentry.captureException(error, context)
    else
      Sentry.captureMessage(errorDescription ? `${message}: ${errorDescription}` : message, {
        ...context,
        level: "error",
      })
  } catch {
    // Reporting must never take the caller down.
  }
}
