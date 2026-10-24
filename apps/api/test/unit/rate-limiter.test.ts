import { describe, expect, it } from "bun:test"
import { createRateLimiter, getRateLimitKey, RateLimitRequest } from "../../src/utils/rate-limiter"

const request = (ip: string, body: Record<string, string>): RateLimitRequest => ({
  headers: new Headers({ "cf-connecting-ip": ip }),
  body,
})

describe("getRateLimitKey", () => {
  const deviceToken = (value: RateLimitRequest) => (value.body as Record<string, string>).token

  it("keeps devices behind the same public IP in separate buckets", () => {
    const firstDevice = request("203.0.113.1", { token: "device-a" })
    const secondDevice = request("203.0.113.1", { token: "device-b" })

    expect(getRateLimitKey(firstDevice, deviceToken)).not.toBe(getRateLimitKey(secondDevice, deviceToken))
  })

  it("keeps requests from the same device in the same bucket", () => {
    const firstRequest = request("203.0.113.1", { token: "device-a" })
    const secondRequest = request("203.0.113.1", { token: "device-a" })

    expect(getRateLimitKey(firstRequest, deviceToken)).toBe(getRateLimitKey(secondRequest, deviceToken))
  })

  it("uses the IP-only bucket when no discriminator is provided", () => {
    expect(getRateLimitKey(request("203.0.113.1", {}))).toBe("203.0.113.1")
  })

  it("falls back to the first x-forwarded-for address", () => {
    expect(getRateLimitKey({ headers: new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }) })).toBe("198.51.100.7")
  })
})

describe("createRateLimiter", () => {
  const withEnv = (env: string, fn: () => void) => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = env
    try {
      fn()
    } finally {
      process.env.NODE_ENV = previous
    }
  }

  it("limits per key inside the window and answers with the standard headers", () => {
    withEnv("production", () => {
      const limiter = createRateLimiter(60_000, 2)
      const first = limiter.check(request("203.0.113.1", {}))
      expect(first.limited).toBe(false)
      expect(first.headers["RateLimit-Limit"]).toBe("2")
      expect(first.headers["RateLimit-Remaining"]).toBe("1")
      expect(limiter.check(request("203.0.113.1", {})).limited).toBe(false)
      expect(limiter.check(request("203.0.113.1", {})).limited).toBe(true)
      // Another client is unaffected.
      expect(limiter.check(request("203.0.113.2", {})).limited).toBe(false)
    })
  })

  it("is off outside production", () => {
    withEnv("test", () => {
      const limiter = createRateLimiter(60_000, 1)
      expect(limiter.check(request("203.0.113.1", {})).limited).toBe(false)
      expect(limiter.check(request("203.0.113.1", {})).limited).toBe(false)
    })
  })
})
