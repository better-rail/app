/**
 * runtime.ts — the Worker's bindings and variables, reachable from any module.
 *
 * Workers hand `env` to each handler instead of exposing it globally, while the
 * rest of this code base reads its configuration the way the Bun server did
 * (module-level getters). Every entrypoint — the fetch handler, the cron
 * handler and each Durable Object constructor — binds `env` here first; the
 * bindings are identical for the lifetime of an isolate, so binding once is
 * enough. Outside a Worker (unit tests, the ingest container, the scripts)
 * `variable()` falls back to `process.env`, so pure modules stay testable
 * under `bun test` without any Cloudflare shim.
 */
import type { D1Database, DurableObjectNamespace, KVNamespace } from "@cloudflare/workers-types"
import type { RideDO } from "./rides/ride-do"
import type { SiriPollerDO } from "./siri/poller-do"

export interface Env {
  DB: D1Database
  KV: KVNamespace
  RIDES: DurableObjectNamespace<RideDO>
  SIRI: DurableObjectNamespace<SiriPollerDO>
  /** The GTFS ingest container (a Durable Object that owns one container instance). */
  INGEST: DurableObjectNamespace
  [variable: string]: unknown
}

let current: Env | undefined

export const bindRuntime = (env: Env) => {
  current = env
}

/** The bound bindings; throws when called outside a Worker entrypoint. */
export const runtime = (): Env => {
  if (!current) throw new Error("Worker bindings are not bound (bindRuntime was not called)")
  return current
}

export const isRuntimeBound = () => current !== undefined

const processEnv = (): Record<string, string | undefined> =>
  typeof process !== "undefined" && process.env ? (process.env as Record<string, string | undefined>) : {}

/** A string variable or secret: the Worker's `env`, else `process.env` (tests, scripts, the container). */
export const variable = (name: string): string | undefined => {
  const bound = current?.[name]
  if (typeof bound === "string") return bound
  if (bound !== undefined && bound !== null && typeof bound !== "object" && typeof bound !== "function") return String(bound)
  return processEnv()[name]
}
