/**
 * container.ts — the Durable Object that owns the GTFS ingest container.
 *
 * The ingest (ingest/main.ts) downloads a feed of a few hundred MB and parses
 * it with Node streams — not a Worker's job (128 MB of memory, no filesystem).
 * It runs as a one-shot Cloudflare Container: the nightly cron (or an operator,
 * via POST /internal/ingest/run) asks this object to start it; the container
 * posts the parsed rail subset back to /internal/ingest and exits, so it is
 * billed for the minutes it runs and nothing else.
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, runtime, type Env } from "../runtime"
import { config } from "../config"
import { logNames, logger } from "../logs"

export const INGEST_CONTAINER_NAME = "ingest"

export class IngestContainer extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  /** Start the container unless it is already running. */
  async run(): Promise<{ started: boolean; reason?: string }> {
    const container = this.ctx.container
    if (!container) return { started: false, reason: "no container is attached to this Durable Object (local dev / tests)" }
    if (container.running) return { started: false, reason: "already running" }

    container.start({
      enableInternet: true,
      env: {
        API_BASE_URL: config.apiBaseUrl,
        INGEST_TOKEN: config.ingestToken,
        NODE_ENV: config.env,
      },
    })
    logger.info(logNames.gtfs.ingest.start, { container: true })

    this.ctx.waitUntil(
      container
        .monitor()
        .then(() => logger.info(logNames.gtfs.ingest.loaded, { container: "exited" }))
        .catch((error) => logger.error(logNames.gtfs.ingest.failed, { error, container: "crashed" })),
    )
    return { started: true }
  }
}

/** The cron's and the operator's entry point. */
export const startIngest = () =>
  (
    runtime().INGEST.getByName(INGEST_CONTAINER_NAME) as unknown as { run(): Promise<{ started: boolean; reason?: string }> }
  ).run()
