import { afterEach, describe, expect, test } from "bun:test"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"

import express, { type Express } from "express"
import { z } from "zod"

import { createApp } from "../index"
import { getReadiness } from "../readiness"
import { getMetricsSnapshot, resetMetrics } from "../metrics"
import { NoActiveFeedError } from "../requests/gtfs-route-api"
import { hasProviderApplicationError } from "../requests/rail-api"
import type { SiriSnapshot } from "../siri/types"
import { errorHandler, requestIdMiddleware, toApiError } from "../api-error"
import { bodyValidator } from "../routes/validations"

const openServer = async (app: Express) => {
  const server = app.listen(0) as Server
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve)
    server.once("error", reject)
  })
  const address = server.address() as AddressInfo
  return { server, baseUrl: `http://127.0.0.1:${address.port}` }
}

const closeServer = async (server: Server) => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
}

const withServer = async (callback: (baseUrl: string) => Promise<void>, app: Express = createApp()) => {
  const { server, baseUrl } = await openServer(app)
  try {
    await callback(baseUrl)
  } finally {
    await closeServer(server)
  }
}

afterEach(() => resetMetrics())

describe("API request contract", () => {
  test("generates and echoes bounded request IDs", async () => {
    await withServer(async (baseUrl) => {
      const generated = await fetch(`${baseUrl}/isAlive`)
      const generatedId = generated.headers.get("x-request-id")
      expect(generatedId).toMatch(/^[0-9a-f-]{36}$/)

      const echoed = await fetch(`${baseUrl}/isAlive`, { headers: { "x-request-id": "123e4567-e89b-12d3-a456-426614174000" } })
      expect(echoed.headers.get("x-request-id")).toBe("123e4567-e89b-12d3-a456-426614174000")

      const replaced = await fetch(`${baseUrl}/isAlive`, { headers: { "x-request-id": "bad request id" } })
      expect(replaced.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  test("returns a stable JSON 404 without exposing the path", async () => {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/private/unknown/path`)
      const body = (await response.json()) as Record<string, unknown>

      expect(response.status).toBe(404)
      expect(body).toMatchObject({ error: "The requested resource was not found", code: "NOT_FOUND", retryable: false })
      expect(body.requestId).toBe(response.headers.get("x-request-id"))
      expect(JSON.stringify(body)).not.toContain("/private/unknown/path")
    })
  })

  test("classifies validation and malformed JSON without raw parser details", async () => {
    const app = express()
    app.use(requestIdMiddleware)
    app.use(express.json())
    app.post("/", bodyValidator(z.object({ name: z.string() })))
    app.use(errorHandler)

    await withServer(async (baseUrl) => {
      const malformed = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      })
      expect(malformed.status).toBe(400)
      expect((await malformed.json()) as Record<string, unknown>).toMatchObject({ code: "VALIDATION_ERROR", retryable: false })

      const invalid = await fetch(`${baseUrl}/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: 42 }),
      })
      expect(invalid.status).toBe(400)
      expect((await invalid.json()) as Record<string, unknown>).toMatchObject({ code: "VALIDATION_ERROR" })
    }, app)
  })

  test("classifies public errors without exposing provider messages", () => {
    const input = toApiError(new Error("provider secret station and token"))
    expect(input).toEqual({ status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred", retryable: true })
    expect(toApiError(new NoActiveFeedError())).toMatchObject({ status: 503, code: "NO_ACTIVE_FEED", retryable: true })
    expect(hasProviderApplicationError({ successStatus: 1, errorMessages: ["provider detail"] })).toBe(true)
    expect(hasProviderApplicationError({ successStatus: 1, errorMessages: { message: "provider detail" } })).toBe(true)
    expect(hasProviderApplicationError({ successStatus: 1, errorMessages: [] })).toBe(false)
  })
})

describe("readiness contract", () => {
  const dependencies = {
    getActiveFeed: async () => ({ feedId: "fixture" }),
    getRedisClient: () => undefined,
    readSnapshot: async () => null,
    railDataSource: "gtfs" as const,
    railConfigured: true,
    redisUrl: undefined,
    siriConfigured: false,
    siriStaleSeconds: 600,
    timeoutMs: 50,
  }

  test("reports ready when required and optional dependencies are healthy", async () => {
    expect(await getReadiness(dependencies)).toEqual({
      status: "ready",
      checks: { database: "ok", gtfs: "ok", redis: "not_configured", siri: "not_configured" },
    })
  })

  test("fails not-ready without an active GTFS feed", async () => {
    const result = await getReadiness({ ...dependencies, getActiveFeed: async () => null })
    expect(result.status).toBe("not_ready")
    expect(result.checks.gtfs).toBe("missing")
  })

  test("returns a request-scoped 503 readiness response without active feed", async () => {
    const app = createApp({ ...dependencies, getActiveFeed: async () => null })
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/ready`)
      const body = (await response.json()) as Record<string, unknown>
      expect(response.status).toBe(503)
      expect(body).toMatchObject({ status: "not_ready", code: "NOT_READY", retryable: true, checks: { gtfs: "missing" } })
      expect(body.requestId).toBe(response.headers.get("x-request-id"))
    }, app)
  })

  test("does not reuse a timed-out database probe", async () => {
    let calls = 0
    const timedDependencies = {
      ...dependencies,
      timeoutMs: 5,
      getActiveFeed: () => {
        calls += 1
        return calls === 1 ? new Promise<never>(() => undefined) : Promise.resolve({ feedId: "fixture" })
      },
    }

    expect((await getReadiness(timedDependencies)).status).toBe("not_ready")
    await new Promise((resolve) => setTimeout(resolve, 60))
    expect((await getReadiness(timedDependencies)).status).toBe("ready")
    expect(calls).toBe(2)
  })

  test("fails not-ready when rail mode is unconfigured", async () => {
    const result = await getReadiness({ ...dependencies, railDataSource: "rail", railConfigured: false })
    expect(result.status).toBe("not_ready")
    expect(result.checks.database).toBe("failed")
  })

  test("fails not-ready for an expired GTFS feed", async () => {
    const result = await getReadiness({
      ...dependencies,
      getActiveFeed: async () => ({ feedId: "fixture", feedEndDate: new Date(Date.now() - 1_000) }),
    })
    expect(result.status).toBe("not_ready")
    expect(result.checks.gtfs).toBe("missing")
  })

  test("reports configured optional Redis loss as degraded", async () => {
    const result = await getReadiness({ ...dependencies, redisUrl: "redis://fixture" })
    expect(result.status).toBe("degraded")
    expect(result.checks.redis).toBe("degraded")
  })

  test("treats malformed SIRI timestamps as degraded", async () => {
    const result = await getReadiness({
      ...dependencies,
      redisUrl: "redis://fixture",
      siriConfigured: true,
      getRedisClient: () => ({ ping: async () => "PONG" }),
      readSnapshot: async () => ({ updatedAt: Number.NaN }) as SiriSnapshot,
    })
    expect(result.status).toBe("degraded")
    expect(result.checks.siri).toBe("degraded")
  })
})

describe("bounded request metrics", () => {
  test("records route families without request identifiers or raw paths", async () => {
    await withServer(async (baseUrl) => {
      await fetch(`${baseUrl}/private/station/3700`)
      await fetch(`${baseUrl}/api/v1/ride/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{",
      })
      const snapshot = getMetricsSnapshot()
      const serialized = JSON.stringify(snapshot)
      expect(serialized).toContain('"route":"other"')
      expect(serialized).toContain('"route":"ride"')
      expect(serialized).toContain('"code":"VALIDATION_ERROR"')
      expect(serialized).not.toContain("3700")
      expect(serialized).not.toContain("x-request-id")
    })
  })
})
