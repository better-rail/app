import rateLimit from "express-rate-limit"
import { env } from "../data/config"

const createRateLimiter = (windowMs: number, max: number) => {
  return rateLimit({
    max,
    windowMs,
    legacyHeaders: false,
    standardHeaders: true,
    skip: () => env !== "production",
    keyGenerator: (req) =>
      (Array.isArray(req.headers["cf-connecting-ip"]) ? req.headers["cf-connecting-ip"][0] : req.headers["cf-connecting-ip"]) ||
      (Array.isArray(req.headers["x-forwarded-for"]) ? req.headers["x-forwarded-for"][0] : req.headers["x-forwarded-for"]) ||
      req.ip,
  })
}

export { createRateLimiter }
