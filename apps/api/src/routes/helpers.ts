/**
 * helpers.ts — the Express conveniences the routes relied on, over Elysia's context.
 */
import type { Context } from "elysia"
import { RateLimiter } from "../utils/rate-limiter"

type Ctx = Pick<Context, "request" | "set" | "body">

/** express-rate-limit's behaviour: standard headers on every reply, 429 + its default message over the limit. */
export const rateLimited = (limiter: RateLimiter) => (ctx: Ctx) => {
  const { limited, headers } = limiter.check({ headers: ctx.request.headers, body: ctx.body })
  Object.assign(ctx.set.headers, headers)
  if (limited) {
    ctx.set.status = 429
    return "Too many requests, please try again later."
  }
}

/** A JSON reply with a status, like `res.status(n).json(o)`. */
export const json = (ctx: Pick<Context, "set">, status: number, payload: unknown) => {
  ctx.set.status = status
  return payload
}

/** `res.sendStatus(404)`. */
export const notFound = (ctx: Pick<Context, "set">) => {
  ctx.set.status = 404
  return "Not Found"
}

/** Elysia parses JSON bodies itself; this covers a client that sent none (or not as JSON). */
export const jsonBody = (body: unknown): Record<string, unknown> =>
  body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : {}

/** Constant-time string comparison for the debug token. */
export const safeEqual = (a: string, b: string): boolean => {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

/** `req.path` relative to a mount point, like Express gave a mounted router. */
export const mountedPath = (request: Request, mount: string): { path: string; search: string } => {
  const url = new URL(request.url)
  const path = url.pathname.startsWith(mount) ? url.pathname.slice(mount.length) || "/" : url.pathname
  return { path, search: url.search }
}
