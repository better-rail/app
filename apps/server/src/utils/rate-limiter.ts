import rateLimit from "express-rate-limit"
import type { Request } from "express"
import { env } from "../data/config"
import { sendApiError } from "../api-error"

type RateLimitDiscriminator = (request: Request) => string | undefined

const getClientIp = (request: Request) =>
  (Array.isArray(request.headers["cf-connecting-ip"])
    ? request.headers["cf-connecting-ip"][0]
    : request.headers["cf-connecting-ip"]) ||
  (Array.isArray(request.headers["x-forwarded-for"])
    ? request.headers["x-forwarded-for"][0]
    : request.headers["x-forwarded-for"]) ||
  request.ip ||
  "unknown"

export const getRateLimitKey = (request: Request, discriminator?: RateLimitDiscriminator) => {
  const clientIp = getClientIp(request)
  const value = discriminator?.(request)

  return value ? `${clientIp}:${value}` : clientIp
}

const createRateLimiter = (windowMs: number, max: number, discriminator?: RateLimitDiscriminator) => {
  return rateLimit({
    max,
    windowMs,
    legacyHeaders: false,
    standardHeaders: true,
    skip: () => env !== "production",
    keyGenerator: (request) => getRateLimitKey(request, discriminator),
    handler: (_request, response) =>
      sendApiError(response, {
        status: 429,
        code: "RATE_LIMITED",
        message: "Too many requests",
        retryable: true,
      }),
  })
}

export { createRateLimiter }
