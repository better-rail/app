/**
 * index.ts — the Worker entry: the API, the cron handler and the Durable Objects.
 *
 * One deployment replaces the Bun server's web service, its SIRI poller service,
 * its two Railway crons, Postgres (D1) and redis (Durable Objects + KV). Every
 * entrypoint binds `env` first (runtime.ts) so the rest of the code reads its
 * configuration the way it always did.
 */
import * as Sentry from "@sentry/cloudflare"

import { app } from "./app"
import { bindRuntime, type Env } from "./runtime"
import { sentryOptions } from "./sentry"
import { runScheduled } from "./scheduled"
import { ApnsTokenDO as ApnsTokenDOClass } from "./push/apns-token-do"
import { RideDO as RideDOClass } from "./rides/ride-do"
import { SiriPollerDO as SiriPollerDOClass } from "./siri/poller-do"
import { IngestContainer as IngestContainerClass } from "./ingest/container"

const handler = {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    bindRuntime(env)
    return app.fetch(request)
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    bindRuntime(env)
    ctx.waitUntil(runScheduled(controller.cron))
  },
} satisfies ExportedHandler<Env>

export default Sentry.withSentry((env) => sentryOptions(env as Record<string, unknown>), handler)

export const RideDO = Sentry.instrumentDurableObjectWithSentry(
  (env) => sentryOptions(env as Record<string, unknown>),
  RideDOClass,
)
export const SiriPollerDO = Sentry.instrumentDurableObjectWithSentry(
  (env) => sentryOptions(env as Record<string, unknown>),
  SiriPollerDOClass,
)
export const ApnsTokenDO = Sentry.instrumentDurableObjectWithSentry(
  (env) => sentryOptions(env as Record<string, unknown>),
  ApnsTokenDOClass,
)
export const IngestContainer = Sentry.instrumentDurableObjectWithSentry(
  (env) => sentryOptions(env as Record<string, unknown>),
  IngestContainerClass,
)
