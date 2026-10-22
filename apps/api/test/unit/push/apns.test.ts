/**
 * apns.test.ts — the APNs client against a stubbed fetch: request shape, provider token, caching, errors.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, mock, spyOn, test } from "bun:test"

import { base64url, base64urlDecode } from "../../../src/push/jwt"
import {
  connectToApn,
  isApnConfigured,
  resetApnTokenCache,
  sendApnAlarmNotification,
  sendApnNotification,
} from "../../../src/push/apns"

const DEVICE_TOKEN = "abc123/device+token"
const KEY_ID = "KEY1234567"
const TEAM_ID = "TEAM123456"
const BUNDLE_ID = "com.example.rail"

let publicKey: CryptoKey

const toPem = (der: ArrayBuffer) => {
  const body = btoa(String.fromCharCode(...new Uint8Array(der))).replace(/(.{64})/g, "$1\n")
  return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`
}

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"])
  publicKey = pair.publicKey
  process.env.APPLE_KEY_CONTENT = toPem(await crypto.subtle.exportKey("pkcs8", pair.privateKey))
  process.env.APPLE_KEY_ID = KEY_ID
  process.env.APPLE_TEAM_ID = TEAM_ID
  process.env.APPLE_BUNDLE_ID = BUNDLE_ID
  delete process.env.APN_ENV
})

type Call = { url: string; init: RequestInit }

const originalFetch = globalThis.fetch
let calls: Call[]
let responses: Response[]

const stubFetch = (...queued: Response[]) => {
  responses = queued
  calls = []
  globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} })
    return responses.shift() ?? new Response(null, { status: 200 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  resetApnTokenCache()
  stubFetch()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

const header = (call: Call, name: string) => (call.init.headers as Record<string, string>)[name]
const body = (call: Call) => JSON.parse(call.init.body as string)
const bearer = (call: Call) => header(call, "authorization").replace(/^bearer /, "")

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

describe("sendApnNotification", () => {
  test("posts a Live Activity push to the sandbox host with apns2's headers and the aps body as given", async () => {
    const aps = { timestamp: 1_700_000_000, event: "update", "content-state": { delay: 2 }, "stale-date": false, alert: null }

    await sendApnNotification(DEVICE_TOKEN, aps, "immediate")

    expect(calls).toHaveLength(1)
    const [call] = calls
    expect(call.url).toBe(`https://api.sandbox.push.apple.com/3/device/${encodeURIComponent(DEVICE_TOKEN)}`)
    expect(call.init.method).toBe("POST")
    expect(header(call, "authorization")).toMatch(/^bearer /)
    expect(header(call, "apns-push-type")).toBe("liveactivity")
    expect(header(call, "apns-priority")).toBe("10")
    expect(header(call, "apns-topic")).toBe(`${BUNDLE_ID}.push-type.liveactivity`)
    expect(header(call, "apns-expiration")).toBeUndefined()
    expect(header(call, "apns-collapse-id")).toBeUndefined()
    expect(body(call)).toEqual({ aps })
  })

  test("uses the production host when APN_ENV is production", async () => {
    process.env.APN_ENV = "production"
    try {
      await sendApnNotification(DEVICE_TOKEN, {}, "immediate")
    } finally {
      delete process.env.APN_ENV
    }

    expect(calls[0].url).toStartWith("https://api.push.apple.com/3/device/")
  })

  test("maps a throttled priority to apns-priority 5", async () => {
    await sendApnNotification(DEVICE_TOKEN, {}, "throttled")

    expect(header(calls[0], "apns-priority")).toBe("5")
  })

  test("signs an ES256 provider token with the key id and team id", async () => {
    const before = Math.floor(Date.now() / 1000)
    await sendApnNotification(DEVICE_TOKEN, {}, "immediate")

    const jwt = decodeJwt(bearer(calls[0]))
    expect(jwt.header).toEqual({ alg: "ES256", kid: KEY_ID })
    expect(jwt.payload.iss).toBe(TEAM_ID)
    expect(jwt.payload.iat).toBeGreaterThanOrEqual(before)
    expect(jwt.payload.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000))
    // The signature is WebCrypto's raw r||s (64 bytes), which is what JWS/APNs want.
    expect(jwt.signature).toHaveLength(64)
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      jwt.signature,
      new TextEncoder().encode(jwt.signingInput),
    )
    expect(valid).toBe(true)
  })

  test("reuses the provider token across sends", async () => {
    await sendApnNotification(DEVICE_TOKEN, {}, "immediate")
    await sendApnNotification(DEVICE_TOKEN, {}, "throttled")

    // ECDSA signatures are randomized, so equal tokens mean one mint, not two with the same iat.
    expect(bearer(calls[1])).toBe(bearer(calls[0]))
  })

  test("rejects with apns2's plain { reason, statusCode } object on an error response", async () => {
    stubFetch(new Response(JSON.stringify({ reason: "BadDeviceToken" }), { status: 400 }))

    const error = await sendApnNotification(DEVICE_TOKEN, {}, "immediate").catch((rejection) => rejection)

    expect(error).toEqual({ reason: "BadDeviceToken", statusCode: 400 })
    expect(error).not.toBeInstanceOf(Error)
  })

  test("falls back to the status text when the error body isn't JSON", async () => {
    stubFetch(new Response("<html>bad gateway</html>", { status: 502, statusText: "Bad Gateway" }))

    await expect(sendApnNotification(DEVICE_TOKEN, {}, "immediate")).rejects.toEqual({ reason: "Bad Gateway", statusCode: 502 })
  })

  test("mints a new provider token after Apple reports the current one expired", async () => {
    stubFetch(
      new Response(JSON.stringify({ reason: "ExpiredProviderToken" }), { status: 403 }),
      new Response(null, { status: 200 }),
    )

    await expect(sendApnNotification(DEVICE_TOKEN, {}, "immediate")).rejects.toMatchObject({ reason: "ExpiredProviderToken" })
    await sendApnNotification(DEVICE_TOKEN, {}, "immediate")

    expect(bearer(calls[1])).not.toBe(bearer(calls[0]))
  })

  test("keeps the provider token on an unrelated error", async () => {
    stubFetch(new Response(JSON.stringify({ reason: "BadDeviceToken" }), { status: 400 }), new Response(null, { status: 200 }))

    await sendApnNotification(DEVICE_TOKEN, {}, "immediate").catch(() => {})
    await sendApnNotification(DEVICE_TOKEN, {}, "immediate")

    expect(bearer(calls[1])).toBe(bearer(calls[0]))
  })
})

describe("sendApnAlarmNotification", () => {
  test("posts a collapsible alert push with the custom data beside aps", async () => {
    const data = { alarm: { rideId: "ride-1", alarmId: "alarm-1", stops: [{ train: 0, fireDate: 1_700_000_000 }] } }

    await sendApnAlarmNotification(DEVICE_TOKEN, {
      alert: { title: "Alarm moved", body: "Now at 12:34" },
      data,
      collapseId: "arrival-alarm-ride-1",
    })

    const [call] = calls
    expect(call.url).toBe(`https://api.sandbox.push.apple.com/3/device/${encodeURIComponent(DEVICE_TOKEN)}`)
    expect(header(call, "apns-push-type")).toBe("alert")
    expect(header(call, "apns-priority")).toBe("10")
    expect(header(call, "apns-topic")).toBe(BUNDLE_ID)
    expect(header(call, "apns-collapse-id")).toBe("arrival-alarm-ride-1")
    expect(header(call, "apns-expiration")).toBeUndefined()
    expect(body(call)).toEqual({
      aps: {
        alert: { title: "Alarm moved", body: "Now at 12:34" },
        "thread-id": "arrival-alarm-ride-1",
        "mutable-content": 1,
        "content-available": 1,
        "interruption-level": "passive",
      },
      ...data,
    })
  })
})

describe("configuration", () => {
  const withoutKey = async (run: () => Promise<void> | void) => {
    const keyId = process.env.APPLE_KEY_ID
    delete process.env.APPLE_KEY_ID
    try {
      await run()
    } finally {
      process.env.APPLE_KEY_ID = keyId
    }
  }

  test("isApnConfigured needs the key id, team id and key content", async () => {
    expect(isApnConfigured()).toBe(true)
    await withoutKey(() => expect(isApnConfigured()).toBe(false))
  })

  test("connectToApn only warns when unconfigured", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {})
    try {
      connectToApn()
      expect(warn).not.toHaveBeenCalled()

      await withoutKey(() => connectToApn())
      expect(warn).toHaveBeenCalledTimes(1)
      expect(warn.mock.calls[0][0]).toContain("Push credentials are missing")
      expect(warn.mock.calls[0][0]).toContain('"service":"apn"')
    } finally {
      warn.mockRestore()
    }
  })
})

test("base64url round-trips bytes without padding or URL-unsafe characters", () => {
  const bytes = Uint8Array.from([0xfb, 0xff, 0xbf, 0x00, 0x01])
  const encoded = base64url(bytes)
  expect(encoded).toBe("-_-_AAE")
  expect(base64urlDecode(encoded)).toEqual(bytes)
})
