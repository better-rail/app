/**
 * apns-token.test.ts — one APNs provider token for the whole deployment.
 *
 * Apple allows one new provider token per key per 20 minutes; every isolate
 * signing its own tripped that limit in production (TooManyProviderTokenUpdates).
 * The authority object hands every caller the same token and rotates it once.
 */
import { env } from "cloudflare:test"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { APNS_TOKEN_NAME } from "../../src/push/apns-token"
import { resetApnTokenCache, sendApnNotification } from "../../src/push/apns"
import { base64urlDecode } from "../../src/push/jwt"
import { bindRuntime, type Env } from "../../src/runtime"

const authority = () => env.APNS_TOKEN.get(env.APNS_TOKEN.idFromName(APNS_TOKEN_NAME))

const payload = (jwt: string) => JSON.parse(new TextDecoder().decode(base64urlDecode(jwt.split(".")[1])))

const realFetch = globalThis.fetch
let bearers: string[]
let apnsResponse: () => Response

beforeEach(() => {
  bindRuntime(env as unknown as Env)
  resetApnTokenCache()
  bearers = []
  apnsResponse = () => new Response(null, { status: 200 })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("push.apple.com")) {
      bearers.push(((init?.headers as Record<string, string>).authorization ?? "").replace(/^bearer /, ""))
      return apnsResponse()
    }
    return realFetch(input, init)
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("ApnsTokenDO", () => {
  it("hands every caller the same signed token", async () => {
    const [a, b] = await Promise.all([authority().token(), authority().token()])
    expect(a).toBe(b)
    expect(await authority().token()).toBe(a)
    expect(payload(a)).toMatchObject({ iss: env.APPLE_TEAM_ID })
  })

  it("rotates once for a rejected token, and not for a token that was already replaced", async () => {
    const current = await authority().token()
    const rotated = await authority().rotate(current)
    expect(rotated).not.toBe(current)
    // A second caller still holding the old token gets the rotated one, not a third token
    expect(await authority().rotate(current)).toBe(rotated)
    expect(await authority().token()).toBe(rotated)
  })

  it("is what sends authenticate with, across isolate caches", async () => {
    await sendApnNotification("device-1", { event: "update" }, "immediate")
    resetApnTokenCache() // another isolate: empty cache, same authority
    await sendApnNotification("device-2", { event: "update" }, "immediate")
    expect(bearers).toHaveLength(2)
    expect(bearers[1]).toBe(bearers[0])
    expect(bearers[0]).toBe(await authority().token())
  })

  it("asks the authority to rotate after Apple rejects the token", async () => {
    const first = await authority().token()
    apnsResponse = () => Response.json({ reason: "ExpiredProviderToken" }, { status: 403 })
    await expect(sendApnNotification("device-1", { event: "update" }, "immediate")).rejects.toMatchObject({
      reason: "ExpiredProviderToken",
    })
    apnsResponse = () => new Response(null, { status: 200 })
    await sendApnNotification("device-1", { event: "update" }, "immediate")
    expect(bearers[0]).toBe(first)
    expect(bearers[1]).not.toBe(first)
    expect(await authority().token()).toBe(bearers[1])
  })
})
