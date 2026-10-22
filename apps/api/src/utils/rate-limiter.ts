/**
 * rate-limiter.ts — a fixed-window limiter per client, kept in isolate memory.
 *
 * The Bun server used express-rate-limit's memory store: one process, so one
 * global window. A Worker runs in many isolates, each with its own counters,
 * so a client gets the limit per isolate rather than per deployment. For
 * these limits (hundreds per 10 minutes, keyed by IP + ride/token) that is the
 * same protection in practice, and it costs no storage round trip per request.
 * Off outside production, like before.
 */
import { config } from "../config"

export type RateLimitRequest = { headers: Headers; body?: unknown }
type RateLimitDiscriminator = (request: RateLimitRequest) => string | undefined

const getClientIp = (headers: Headers) =>
  headers.get("cf-connecting-ip") || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

export const getRateLimitKey = (request: RateLimitRequest, discriminator?: RateLimitDiscriminator) => {
  const clientIp = getClientIp(request.headers)
  const value = discriminator?.(request)

  return value ? `${clientIp}:${value}` : clientIp
}

type Window = { count: number; resetAt: number }

export type RateLimiter = {
  /** Headers to add, and whether the request is over the limit. */
  check(request: RateLimitRequest): { limited: boolean; headers: Record<string, string> }
}

const MAX_TRACKED_KEYS = 10_000

export const createRateLimiter = (windowMs: number, max: number, discriminator?: RateLimitDiscriminator): RateLimiter => {
  const windows = new Map<string, Window>()

  return {
    check(request) {
      if (config.env !== "production") return { limited: false, headers: {} }

      const now = Date.now()
      const key = getRateLimitKey(request, discriminator)
      let window = windows.get(key)
      if (!window || window.resetAt <= now) {
        if (windows.size >= MAX_TRACKED_KEYS) windows.clear()
        window = { count: 0, resetAt: now + windowMs }
        windows.set(key, window)
      }
      window.count++

      const headers = {
        "RateLimit-Limit": String(max),
        "RateLimit-Remaining": String(Math.max(0, max - window.count)),
        "RateLimit-Reset": String(Math.ceil((window.resetAt - now) / 1000)),
      }
      return { limited: window.count > max, headers }
    },
  }
}
