import type { RequestHandler } from "express"

export type MetricSnapshot = {
  route: string
  method: string
  status: number
  code: string
  latencyBucket: string
  count: number
}

const MAX_METRICS = 256
const metrics = new Map<string, MetricSnapshot>()

const routeFamily = (path: string) => {
  if (path === "/isAlive") return "liveness"
  if (path === "/ready") return "readiness"
  if (path.startsWith("/api/v1/ride")) return "ride"
  if (path.startsWith("/api/v1/fares")) return "fares"
  if (path.startsWith("/api/v1/siri")) return "siri-debug"
  if (path.startsWith("/api/v1/rail-api")) return "rail-api"
  return "other"
}

const methodFamily = (method: string) => {
  if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return method
  return "OTHER"
}

const codeFamily = (value: unknown) => (typeof value === "string" && /^[A-Z][A-Z0-9_]{1,63}$/.test(value) ? value : "OK")

const latencyBucket = (durationMs: number) => {
  if (durationMs < 50) return "lt_50ms"
  if (durationMs < 250) return "lt_250ms"
  if (durationMs < 1000) return "lt_1s"
  if (durationMs < 5000) return "lt_5s"
  return "gte_5s"
}

export const recordRequestMetric = (input: Omit<MetricSnapshot, "count">) => {
  const key = JSON.stringify([input.route, input.method, input.status, input.code, input.latencyBucket])
  const existing = metrics.get(key)
  if (existing) {
    existing.count += 1
    return
  }
  if (metrics.size >= MAX_METRICS) {
    const first = metrics.keys().next().value
    if (first) metrics.delete(first)
  }
  metrics.set(key, { ...input, count: 1 })
}

export const metricsMiddleware: RequestHandler = (req, res, next) => {
  const startedAt = Date.now()
  res.once("finish", () => {
    recordRequestMetric({
      route: routeFamily(req.path),
      method: methodFamily(req.method),
      status: res.statusCode,
      code: codeFamily(res.locals.apiErrorCode),
      latencyBucket: latencyBucket(Date.now() - startedAt),
    })
  })
  next()
}

export const getMetricsSnapshot = () => [...metrics.values()].map((metric) => ({ ...metric }))

export const resetMetrics = () => metrics.clear()
