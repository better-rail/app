/**
 * apns.ts — the Apple Push Notification service client, on fetch + WebCrypto.
 *
 * Replaces `apns2`, which needs Node's http2 and crypto. APNs over HTTP/2 is
 * just `POST /3/device/<token>` with a provider-token JWT, so a Worker's fetch
 * covers it. Same call sites as the Bun server's apn-utils: a Live Activity
 * push per ride update and a visible alert push when an arrival alarm moves.
 * Failures reject with apns2's plain `{ reason, statusCode }` object, which
 * sentry.ts knows how to describe.
 */
import type { DurableObjectNamespace } from "@cloudflare/workers-types"

import { config } from "../config"
import { logNames, logger } from "../logs"
import { isRuntimeBound, runtime } from "../runtime"
import { APNS_TOKEN_NAME, mintProviderToken, TOKEN_LIFETIME_MS } from "./apns-token"
import type { ApnsTokenDO } from "./apns-token-do"

export type ApnPriority = "immediate" | "throttled"

export type ApnError = { reason: string; statusCode: number }

const API_VERSION = 3

// How long an isolate reuses the token it got from the authority before asking again (the authority rotates at 50 min).
const ISOLATE_CACHE_MS = 5 * 60 * 1000

const PRIORITY_HEADER: Record<ApnPriority, string> = { immediate: "10", throttled: "5" }

// Apple rejects the provider token when its signing key was revoked or it aged out; either way a fresh one is due.
const PROVIDER_TOKEN_REASONS = new Set(["ExpiredProviderToken", "InvalidProviderToken"])

type CachedToken = { credentials: string; value: Promise<string>; issuedAt: number; lifetimeMs: number }

let cached: CachedToken | undefined
// The token Apple last rejected; the next send asks the authority to rotate it rather than mint on its own.
let rejected: string | undefined

export const isApnConfigured = () => Boolean(config.appleKeyId && config.appleTeamId && config.appleKeyContent)

/** Nothing to connect: the token is minted on first send. Kept so the entrypoints can warn once when unconfigured. */
export const connectToApn = () => {
  if (!isApnConfigured()) logger.warn(logNames.notifications.notConfigured, { service: "apn" })
}

/** Tests: forget the cached provider token. */
export const resetApnTokenCache = () => {
  cached = undefined
  rejected = undefined
}

/** The deployment-wide token authority (`ApnsTokenDO`); absent outside a Worker (unit tests, scripts). */
const tokenAuthority = () => {
  if (!isRuntimeBound()) return undefined
  const namespace = runtime().APNS_TOKEN as DurableObjectNamespace<ApnsTokenDO> | undefined
  return namespace?.get(namespace.idFromName(APNS_TOKEN_NAME))
}

/**
 * The provider token. In a Worker it comes from the authority, which signs one token per 50 minutes for every isolate
 * (Apple allows one new token per 20 minutes per key, and each ride's Durable Object may be its own isolate); the
 * isolate keeps it for 5 minutes between asks. Without the authority the isolate signs its own, as the Bun server did.
 */
const getProviderToken = () => {
  const { appleTeamId, appleKeyId, appleKeyContent } = config
  const credentials = `${appleTeamId}|${appleKeyId}|${appleKeyContent}`
  if (cached && cached.credentials === credentials && Date.now() - cached.issuedAt < cached.lifetimeMs) return cached.value

  const authority = tokenAuthority()
  const stale = rejected
  rejected = undefined
  const entry: CachedToken = {
    credentials,
    issuedAt: Date.now(),
    lifetimeMs: authority ? ISOLATE_CACHE_MS : TOKEN_LIFETIME_MS,
    value: authority
      ? stale
        ? authority.rotate(stale)
        : authority.token()
      : mintProviderToken(appleTeamId, appleKeyId, appleKeyContent),
  }
  // A failed mint (bad PEM) shouldn't be cached as the token for the next 50 minutes.
  entry.value.catch(() => {
    if (cached === entry) cached = undefined
  })
  cached = entry
  return entry.value
}

type ApnRequest = {
  deviceToken: string
  pushType: "alert" | "liveactivity"
  topic: string
  priority: ApnPriority
  collapseId?: string
  body: Record<string, unknown>
}

const post = async (request: ApnRequest) => {
  const token = await getProviderToken()
  const headers: Record<string, string> = {
    authorization: `bearer ${token}`,
    "content-type": "application/json",
    "apns-push-type": request.pushType,
    "apns-priority": PRIORITY_HEADER[request.priority],
    "apns-topic": request.topic,
    // Deliver now or not at all: a stale ride update or alarm move is worse than none.
  }
  if (request.collapseId) headers["apns-collapse-id"] = request.collapseId

  const url = `${config.appleApnHost}/${API_VERSION}/device/${encodeURIComponent(request.deviceToken)}`
  const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(request.body) })
  if (response.ok) return

  let reason: string | undefined
  try {
    reason = ((await response.json()) as { reason?: string }).reason
  } catch {
    // A non-JSON body (a proxy error page, say): the status line is all there is.
  }
  const error: ApnError = { reason: reason || response.statusText || "UnknownError", statusCode: response.status }
  if (error.statusCode === 403 && PROVIDER_TOKEN_REASONS.has(error.reason)) {
    cached = undefined
    rejected = token
  }
  throw error
}

/** A Live Activity update: `aps` is the full payload the caller built (event, content-state, stale/dismissal dates, alert). */
export const sendApnNotification = (deviceToken: string, aps: Record<string, unknown>, priority: ApnPriority) =>
  post({
    deviceToken,
    priority,
    pushType: "liveactivity",
    topic: `${config.appleBundleId}.push-type.liveactivity`,
    body: { aps },
  })

/** A visible push to the app's device token. The notification service extension moves the arrival alarm before it's shown. */
export const sendApnAlarmNotification = (
  deviceToken: string,
  options: { alert: { title: string; body: string }; data: Record<string, unknown>; collapseId: string },
) =>
  post({
    deviceToken,
    pushType: "alert",
    topic: config.appleBundleId,
    priority: "immediate",
    collapseId: options.collapseId,
    body: {
      aps: {
        alert: options.alert,
        "thread-id": options.collapseId,
        "mutable-content": 1,
        // Wakes a suspended (not force-quit) app too, in case the extension couldn't move the alarm.
        "content-available": 1,
        // Lands quietly in Notification Center: no sound, no banner, no screen wake.
        "interruption-level": "passive",
      },
      // Custom keys sit beside `aps` at the top level, as apns2 placed `data`.
      ...options.data,
    },
  })
