/**
 * fcm.test.ts — the FCM client against a stubbed fetch: OAuth2 exchange, message shape, caching, errors, retry.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"

import { base64urlDecode } from "../../../src/push/jwt"
import {
  FcmError,
  connectToFcm,
  formatTtl,
  isFcmConfigured,
  resetFcmTokenCache,
  sendFcmNotification,
} from "../../../src/push/fcm"

const PROJECT_ID = "better-rail-test"
const CLIENT_EMAIL = "push@better-rail-test.iam.gserviceaccount.com"
const DEVICE_TOKEN = "fcm-device-token"
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SEND_URL = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`

let publicKey: CryptoKey

const toPem = (der: ArrayBuffer) => {
  const body = btoa(String.fromCharCode(...new Uint8Array(der))).replace(/(.{64})/g, "$1\n")
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  )
  publicKey = pair.publicKey
  process.env.FIREBASE_ADMIN_AUTH = JSON.stringify({
    project_id: PROJECT_ID,
    client_email: CLIENT_EMAIL,
    private_key: toPem(await crypto.subtle.exportKey("pkcs8", pair.privateKey)),
  })
})

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
let calls: Call[]
let sendResponses: Response[]

const tokenResponse = (accessToken = "access-token-1", expiresIn = 3600) =>
  new Response(JSON.stringify({ access_token: accessToken, expires_in: expiresIn, token_type: "Bearer" }), { status: 200 })

const sentResponse = (name = `projects/${PROJECT_ID}/messages/0:1`) => new Response(JSON.stringify({ name }), { status: 200 })

const errorResponse = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

const fcmErrorBody = (canonical: string, errorCode?: string) => ({
  error: {
    code: 404,
    message: "Requested entity was not found.",
    status: canonical,
    details: errorCode ? [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }] : [],
  },
})

/** Queues the FCM send responses; the token endpoint always answers with a fresh token. */
const stubFetch = (...queued: Response[]) => {
  sendResponses = queued
  calls = []
  globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    if (String(input) === TOKEN_URL) return tokenResponse(`access-token-${calls.length}`)
    return sendResponses.shift() ?? sentResponse()
  }) as unknown as typeof fetch
}

beforeEach(() => {
  resetFcmTokenCache()
  stubFetch()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

const header = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name]
const body = (call: Call) => JSON.parse(call.init.body as string)
const sendCalls = () => calls.filter((call) => call.url === SEND_URL)
const tokenCalls = () => calls.filter((call) => call.url === TOKEN_URL)

const decodeJwt = (jwt: string) => {
  const [headerPart, payloadPart, signaturePart] = jwt.split(".")
  const decoder = new TextDecoder()
  return {
    header: JSON.parse(decoder.decode(base64urlDecode(headerPart))),
    payload: JSON.parse(decoder.decode(base64urlDecode(payloadPart))),
    signature: base64urlDecode(signaturePart),
    signingInput: `${headerPart}.${payloadPart}`,
  }
}

describe("sendFcmNotification", () => {
  test("exchanges a signed RS256 assertion for an access token, then posts the v1 message", async () => {
    const before = Math.floor(Date.now() / 1000)
    const name = await sendFcmNotification({
      token: DEVICE_TOKEN,
      data: { type: "live-ride", status: "inTransit", delay: "2", nextStationId: "20" },
      android: { ttl: 90 * 1000, priority: "high" },
    })

    expect(name).toBe(`projects/${PROJECT_ID}/messages/0:1`)
    expect(calls.map((call) => call.url)).toEqual([TOKEN_URL, SEND_URL])

    const [token, send] = calls
    expect(token.init.method).toBe("POST")
    expect(header(token, "content-type")).toBe("application/x-www-form-urlencoded")
    const form = new URLSearchParams(token.init.body as string)
    expect(form.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer")
    const jwt = decodeJwt(form.get("assertion")!)
    expect(jwt.header).toEqual({ alg: "RS256", typ: "JWT" })
    expect(jwt.payload).toMatchObject({
      iss: CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: TOKEN_URL,
    })
    expect(jwt.payload.iat).toBeGreaterThanOrEqual(before)
    expect(jwt.payload.exp).toBe(jwt.payload.iat + 3600)
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      publicKey,
      jwt.signature,
      new TextEncoder().encode(jwt.signingInput),
    )
    expect(valid).toBe(true)

    expect(send.init.method).toBe("POST")
    expect(header(send, "authorization")).toBe("Bearer access-token-1")
    expect(header(send, "content-type")).toBe("application/json")
    expect(body(send)).toEqual({
      message: {
        token: DEVICE_TOKEN,
        data: { type: "live-ride", status: "inTransit", delay: "2", nextStationId: "20" },
        android: { ttl: "90s", priority: "HIGH" },
      },
    })
  })

  test("maps collapseKey to collapse_key and leaves absent fields out", async () => {
    await sendFcmNotification({
      token: DEVICE_TOKEN,
      data: { type: "arrival-alarm" },
      android: { priority: "high", collapseKey: "arrival-alarm-ride-1", ttl: 0 },
    })
    await sendFcmNotification({ token: DEVICE_TOKEN })

    const [withAndroid, bare] = sendCalls()
    expect(body(withAndroid).message.android).toEqual({ ttl: "0s", priority: "HIGH", collapse_key: "arrival-alarm-ride-1" })
    expect(body(bare)).toEqual({ message: { token: DEVICE_TOKEN } })
  })

  test("reuses the access token across sends", async () => {
    await sendFcmNotification({ token: DEVICE_TOKEN })
    await sendFcmNotification({ token: DEVICE_TOKEN })

    expect(tokenCalls()).toHaveLength(1)
    expect(sendCalls().map((call) => header(call, "authorization"))).toEqual(["Bearer access-token-1", "Bearer access-token-1"])
  })

  test("fetches a new access token when the cached one is about to expire", async () => {
    globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      // Already inside the 5-minute refresh margin.
      return String(input) === TOKEN_URL ? tokenResponse(`access-token-${calls.length}`, 60) : sentResponse()
    }) as unknown as typeof fetch

    await sendFcmNotification({ token: DEVICE_TOKEN })
    await sendFcmNotification({ token: DEVICE_TOKEN })

    expect(tokenCalls()).toHaveLength(2)
  })

  test("throws FcmError with the SDK's code for an unregistered token", async () => {
    stubFetch(errorResponse(404, fcmErrorBody("NOT_FOUND", "UNREGISTERED")))

    const error = await sendFcmNotification({ token: DEVICE_TOKEN }).catch((rejection) => rejection)

    expect(error).toBeInstanceOf(FcmError)
    expect(error).toBeInstanceOf(Error)
    expect(error.code).toBe("messaging/registration-token-not-registered")
    expect(error.status).toBe(404)
    expect(error.message).toBe("Requested entity was not found.")
  })

  test("maps the other FCM statuses the ride code may see", async () => {
    stubFetch(
      errorResponse(400, { error: { status: "INVALID_ARGUMENT", message: "bad token" } }),
      errorResponse(401, { error: { status: "UNAUTHENTICATED", message: "nope" } }),
      new Response("<html>teapot</html>", { status: 418 }),
    )

    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).rejects.toMatchObject({ code: "messaging/invalid-argument" })
    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).rejects.toMatchObject({
      code: "messaging/unknown-error",
      status: 401,
    })
    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).rejects.toMatchObject({
      code: "messaging/unknown-error",
      status: 418,
    })
  })

  test("retries once after a 500 and returns the retried send", async () => {
    stubFetch(
      errorResponse(500, { error: { status: "INTERNAL", message: "Internal error encountered." } }),
      sentResponse("retried"),
    )

    const started = Date.now()
    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).resolves.toBe("retried")

    expect(Date.now() - started).toBeGreaterThanOrEqual(950)
    expect(sendCalls()).toHaveLength(2)
    expect(tokenCalls()).toHaveLength(1)
  })

  test("gives up after the one retry on a persistent 503", async () => {
    stubFetch(
      errorResponse(503, { error: { status: "UNAVAILABLE", message: "down" } }),
      errorResponse(503, { error: { status: "UNAVAILABLE", message: "still down" } }),
    )

    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).rejects.toMatchObject({
      code: "messaging/server-unavailable",
      status: 503,
      message: "still down",
    })
    expect(sendCalls()).toHaveLength(2)
  })

  test("fails with an authentication error when the token exchange is refused, and retries it on the next send", async () => {
    let refuse = true
    globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} })
      if (String(input) !== TOKEN_URL) return sentResponse()
      if (!refuse) return tokenResponse()
      refuse = false
      return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 })
    }) as unknown as typeof fetch

    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).rejects.toMatchObject({
      code: "messaging/authentication-error",
      status: 400,
    })
    expect(sendCalls()).toHaveLength(0)

    await expect(sendFcmNotification({ token: DEVICE_TOKEN })).resolves.toBeString()
    expect(tokenCalls()).toHaveLength(2)
  })
})

describe("formatTtl", () => {
  test("renders milliseconds the way firebase-admin did", () => {
    expect(formatTtl(90_000)).toBe("90s")
    expect(formatTtl(0)).toBe("0s")
    expect(formatTtl(1_500)).toBe("1.500000000s")
  })
})

describe("configuration", () => {
  const withoutAuth = async (run: () => Promise<void> | void) => {
    const auth = process.env.FIREBASE_ADMIN_AUTH
    delete process.env.FIREBASE_ADMIN_AUTH
    try {
      await run()
    } finally {
      process.env.FIREBASE_ADMIN_AUTH = auth
    }
  }

  test("isFcmConfigured needs a service account with a project id", async () => {
    expect(isFcmConfigured()).toBe(true)
    await withoutAuth(() => expect(isFcmConfigured()).toBe(false))
  })

  test("connectToFcm only warns when unconfigured", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {})
    try {
      connectToFcm()
      expect(warn).not.toHaveBeenCalled()

      await withoutAuth(() => connectToFcm())
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain('"service":"fcm"')
    } finally {
      warn.mockRestore()
    }
  })
})
