import type { RequestHandler } from "express"

import { railDataSource, redisUrl, siriKey, siriStaleSeconds, siriUrl } from "./data/config"
import { getRequestId } from "./api-error"
import { isRailApiConfigured } from "./requests/rail-api"
import { getActiveFeed } from "./db"
import { getRedisClient } from "./data/redis"
import { readSnapshot } from "./siri/snapshot"
import type { SiriSnapshot } from "./siri/types"

export type ReadinessState = "ready" | "degraded" | "not_ready"
export type ReadinessCheck = "ok" | "failed" | "missing" | "degraded" | "not_configured" | "not_applicable"

export type ReadinessDependencies = {
  getActiveFeed: () => Promise<unknown>
  getRedisClient: () => { ping: () => Promise<unknown> } | undefined
  readSnapshot: () => Promise<SiriSnapshot | null>
  railDataSource: "gtfs" | "rail"
  railConfigured: boolean
  redisUrl?: string
  siriConfigured: boolean
  siriStaleSeconds: number
  timeoutMs: number
}

export type ReadinessResult = {
  status: ReadinessState
  checks: {
    database: ReadinessCheck
    gtfs: ReadinessCheck
    redis: ReadinessCheck
    siri: ReadinessCheck
  }
}

const defaultDependencies: ReadinessDependencies = {
  getActiveFeed,
  getRedisClient,
  readSnapshot,
  railDataSource,
  railConfigured: isRailApiConfigured(),
  redisUrl,
  siriConfigured: Boolean(siriUrl && siriKey),
  siriStaleSeconds,
  timeoutMs: 1500,
}

const inFlight = new WeakMap<ReadinessDependencies, Map<string, Promise<unknown>>>()
const cooldowns = new WeakMap<ReadinessDependencies, Map<string, number>>()

const share = <T>(dependencies: ReadinessDependencies, key: string, operation: () => Promise<T>) => {
  let operations = inFlight.get(dependencies)
  if (!operations) {
    operations = new Map()
    inFlight.set(dependencies, operations)
  }
  const existing = operations.get(key) as Promise<T> | undefined
  if (existing) return existing
  const promise = Promise.resolve().then(operation)
  operations.set(key, promise)
  const clearIfCurrent = () => {
    if (operations?.get(key) === promise) operations.delete(key)
  }
  void promise.then(clearIfCurrent, clearIfCurrent)
  return promise
}

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error("readiness timeout")), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const withSharedTimeout = async <T>(
  dependencies: ReadinessDependencies,
  key: string,
  operation: () => Promise<T>,
): Promise<T> => {
  let cooldownMap = cooldowns.get(dependencies)
  if (!cooldownMap) {
    cooldownMap = new Map()
    cooldowns.set(dependencies, cooldownMap)
  }
  if ((cooldownMap.get(key) ?? 0) > Date.now()) throw new Error("readiness probe cooling down")

  const promise = share(dependencies, key, operation)
  try {
    const result = await withTimeout(promise, dependencies.timeoutMs)
    cooldownMap.delete(key)
    return result
  } catch (error) {
    const operations = inFlight.get(dependencies)
    if (operations?.get(key) === promise) operations.delete(key)
    if (error instanceof Error && error.message === "readiness timeout") {
      cooldownMap.set(key, Date.now() + Math.max(50, dependencies.timeoutMs * 2))
    }
    throw error
  }
}

const toTime = (value: unknown) => (value instanceof Date ? value.getTime() : new Date(value as string | number).getTime())

const feedIsCurrent = (value: unknown) => {
  if (!value || typeof value !== "object") return false
  const feed = value as { feedStartDate?: unknown; feedEndDate?: unknown }
  const now = Date.now()
  const start = feed.feedStartDate == null ? null : toTime(feed.feedStartDate)
  const end = feed.feedEndDate == null ? null : toTime(feed.feedEndDate)
  if (start !== null && (!Number.isFinite(start) || start > now)) return false
  if (end !== null && (!Number.isFinite(end) || end <= now)) return false
  return true
}

const checkDatabase = async (dependencies: ReadinessDependencies): Promise<ReadinessCheck> => {
  if (dependencies.railDataSource === "rail") return dependencies.railConfigured ? "not_applicable" : "failed"
  try {
    return feedIsCurrent(await withSharedTimeout(dependencies, "database", dependencies.getActiveFeed)) ? "ok" : "missing"
  } catch {
    return "failed"
  }
}

const checkRedis = async (dependencies: ReadinessDependencies): Promise<ReadinessCheck> => {
  if (!dependencies.redisUrl) return "not_configured"
  const client = dependencies.getRedisClient()
  if (!client) return "degraded"
  try {
    await withSharedTimeout(dependencies, "redis", () => client.ping())
    return "ok"
  } catch {
    return "degraded"
  }
}

const checkSiri = async (dependencies: ReadinessDependencies): Promise<ReadinessCheck> => {
  if (!dependencies.siriConfigured) return "not_configured"
  if (!dependencies.getRedisClient()) return "degraded"
  try {
    const snapshot = await withSharedTimeout(dependencies, "siri", dependencies.readSnapshot)
    if (!snapshot || !Number.isFinite(snapshot.updatedAt) || snapshot.updatedAt <= 0) return "degraded"
    const age = Date.now() - snapshot.updatedAt
    if (age < -dependencies.timeoutMs || age > dependencies.siriStaleSeconds * 1000) return "degraded"
    return "ok"
  } catch {
    return "degraded"
  }
}

export const getReadiness = async (dependencies: ReadinessDependencies = defaultDependencies): Promise<ReadinessResult> => {
  const [database, redis, siri] = await Promise.all([
    checkDatabase(dependencies),
    checkRedis(dependencies),
    checkSiri(dependencies),
  ])
  const gtfs = database === "not_applicable" ? "not_applicable" : database === "missing" ? "missing" : database
  const notReady = database === "failed" || database === "missing"
  const degraded = redis === "degraded" || redis === "failed" || siri === "degraded" || siri === "failed"
  return {
    status: notReady ? "not_ready" : degraded ? "degraded" : "ready",
    checks: { database, gtfs, redis, siri },
  }
}

export const readinessHandler = (dependencies: ReadinessDependencies = defaultDependencies): RequestHandler => {
  return async (_req, res) => {
    const result = await getReadiness(dependencies)
    const requestId = getRequestId(res)
    const code = result.status === "not_ready" ? "NOT_READY" : result.status === "degraded" ? "DEGRADED" : "READY"
    res.locals.apiErrorCode = code
    res.status(result.status === "not_ready" ? 503 : 200).json({
      ...result,
      code,
      message:
        result.status === "not_ready"
          ? "Required dependencies are unavailable"
          : result.status === "degraded"
            ? "Optional dependencies are degraded"
            : "Service is ready",
      retryable: result.status === "not_ready",
      requestId,
    })
  }
}
