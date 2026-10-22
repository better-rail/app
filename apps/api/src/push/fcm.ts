/**
 * fcm.ts — the Firebase Cloud Messaging client, on fetch + WebCrypto.
 *
 * Replaces `firebase-admin`, which pulls in Node's crypto, fs and http. FCM's
 * HTTP v1 API is one authenticated POST per message, and the service account's
 * OAuth2 access token is a signed JWT swapped at Google's token endpoint, so a
 * Worker's fetch covers both. The message shape, the ttl (milliseconds), the
 * `messaging/*` error codes and the retry on a transient failure match what the
 * Bun server's fcm-utils got from the SDK, so the ride code is unchanged.
 */
import { config } from "../config"
import { logNames, logger } from "../logs"
import { importPrivateKey, signJwt } from "./jwt"

export type FcmMessage = {
  token: string
  data?: Record<string, string>
  android?: { ttl?: number; priority?: "high" | "normal"; collapseKey?: string }
}

export type FcmErrorCode =
  | "messaging/registration-token-not-registered"
  | "messaging/invalid-argument"
  | "messaging/authentication-error"
  | "messaging/internal-error"
  | "messaging/server-unavailable"
  | "messaging/unknown-error"

export class FcmError extends Error {
  code: FcmErrorCode
  status: number

  constructor(code: FcmErrorCode, status: number, message: string) {
    super(message)
    this.name = "FcmError"
    this.code = code
    this.status = status
  }
}

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging"
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer"
const ASSERTION_LIFETIME_S = 60 * 60
// Google's tokens last an hour; refresh a little early so a send never carries one that expires in flight.
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

// FCM answers 500 when Google's side hiccups and 503 when it's overloaded; its docs say to retry both.
const TRANSIENT_STATUSES = new Set([500, 503])
const RETRY_DELAY_MS = 1_000

type CachedToken = { credentials: string; value: Promise<{ accessToken: string; expiresAt: number }> }

let cached: CachedToken | undefined

export const isFcmConfigured = () => Boolean(config.firebaseAdminAuth?.project_id)

/** Nothing to connect: the access token is fetched on first send. Kept so the entrypoints can warn once when unconfigured. */
export const connectToFcm = () => {
  if (!isFcmConfigured()) logger.warn(logNames.notifications.notConfigured, { service: "fcm" })
}

/** Tests: forget the cached access token. */
export const resetFcmTokenCache = () => {
  cached = undefined
}

const exchangeToken = async (clientEmail: string, privateKey: string) => {
  const key = await importPrivateKey(privateKey, "RS256")
  const now = Math.floor(Date.now() / 1000)
  const assertion = await signJwt(
    { alg: "RS256", typ: "JWT" },
    { iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + ASSERTION_LIFETIME_S },
    key,
    "RS256",
  )

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: GRANT_TYPE, assertion }).toString(),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new FcmError("messaging/authentication-error", response.status, `Google OAuth2 token request failed: ${text}`)
  }

  const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number }
  return { accessToken: access_token, expiresAt: Date.now() + expires_in * 1000 }
}

/** The service account's access token, fetched once per isolate and reused until ~5 minutes before it expires. */
const getAccessToken = async () => {
  const { client_email = "", private_key = "" } = config.firebaseAdminAuth
  const credentials = `${client_email}|${private_key}`

  if (cached?.credentials === credentials) {
    const token = await cached.value.catch(() => undefined)
    if (token && token.expiresAt - Date.now() > TOKEN_REFRESH_MARGIN_MS) return token.accessToken
  }

  const entry: CachedToken = { credentials, value: exchangeToken(client_email, private_key) }
  // A failed exchange shouldn't block the next send from trying again.
  entry.value.catch(() => {
    if (cached === entry) cached = undefined
  })
  cached = entry
  return (await entry.value).accessToken
}

/** Milliseconds as FCM's protobuf Duration string (`"90s"`, `"1.500000000s"`), the way firebase-admin converted `ttl`. */
export const formatTtl = (milliseconds: number) => {
  const seconds = Math.floor(milliseconds / 1000)
  const nanos = Math.floor((milliseconds - seconds * 1000) * 1_000_000)
  return nanos > 0 ? `${seconds}.${nanos.toString().padStart(9, "0")}s` : `${seconds}s`
}

/** The HTTP v1 message body: snake_case keys, string ttl, upper-case priority; absent fields stay absent. */
const buildMessage = (message: FcmMessage) => {
  const android: Record<string, unknown> = {}
  if (message.android?.ttl !== undefined) android.ttl = formatTtl(message.android.ttl)
  if (message.android?.priority) android.priority = message.android.priority.toUpperCase()
  if (message.android?.collapseKey) android.collapse_key = message.android.collapseKey

  return {
    token: message.token,
    ...(message.data && { data: message.data }),
    ...(Object.keys(android).length > 0 && { android }),
  }
}

type FcmErrorBody = {
  error?: { status?: string; message?: string; details?: { "@type"?: string; errorCode?: string }[] }
}

const FCM_ERROR_TYPE = "type.googleapis.com/google.firebase.fcm.v1.FcmError"

/** The FCM-specific code (`UNREGISTERED`) when the body carries one, else the canonical status (`NOT_FOUND`). */
const serverErrorCode = (body: FcmErrorBody) => {
  const fcmDetail = body.error?.details?.find((detail) => detail["@type"] === FCM_ERROR_TYPE)
  return fcmDetail?.errorCode ?? body.error?.status
}

const toFcmError = async (response: Response) => {
  let body: FcmErrorBody = {}
  let text = ""
  try {
    text = await response.text()
    body = JSON.parse(text)
  } catch {
    // A non-JSON body (a proxy error page, say): the status alone decides the code.
  }

  const serverCode = serverErrorCode(body)
  const message = body.error?.message || `FCM request failed with status ${response.status}: ${text}`

  let code: FcmErrorCode = "messaging/unknown-error"
  if (serverCode === "UNREGISTERED" || serverCode === "NOT_FOUND" || response.status === 404) {
    code = "messaging/registration-token-not-registered"
  } else if (serverCode === "INVALID_ARGUMENT" || response.status === 400) {
    code = "messaging/invalid-argument"
  } else if (serverCode === "UNAVAILABLE" || response.status === 503) {
    code = "messaging/server-unavailable"
  } else if (serverCode === "INTERNAL" || response.status === 500) {
    code = "messaging/internal-error"
  }

  return new FcmError(code, response.status, message)
}

const post = async (body: string) => {
  const url = `https://fcm.googleapis.com/v1/projects/${config.firebaseAdminAuth.project_id}/messages:send`
  const headers = { authorization: `Bearer ${await getAccessToken()}`, "content-type": "application/json" }
  return fetch(url, { method: "POST", headers, body })
}

/** Sends one message and resolves with its name (`projects/<id>/messages/<message id>`). */
export const sendFcmNotification = async (message: FcmMessage) => {
  const body = JSON.stringify({ message: buildMessage(message) })

  let response = await post(body)
  if (TRANSIENT_STATUSES.has(response.status)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    response = await post(body)
  }
  if (!response.ok) throw await toFcmError(response)

  const { name } = (await response.json()) as { name: string }
  return name
}
