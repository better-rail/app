/**
 * container.ts — the Durable Object that owns the GTFS ingest container.
 *
 * The ingest (ingest/main.ts) downloads a feed of a few hundred MB and parses
 * it with Node streams — not a Worker's job (128 MB of memory, no filesystem).
 * It runs as a one-shot Cloudflare Container: the nightly cron (or an operator,
 * via POST /internal/ingest/run) asks this object to start it; the container
 * posts the parsed rail subset back to /internal/ingest and exits, so it is
 * billed for the minutes it runs and nothing else.
 *
 * Nobody calls this object while the job runs, so it keeps itself awake on an
 * alarm and tells the runtime to keep the container (run-state.ts): an idle
 * object is evicted, and a container with no connection and no inactivity
 * timeout may be stopped with it — which is how the nightly job died mid-run.
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, runtime, type Env } from "../runtime"
import { config } from "../config"
import { logNames, logger } from "../logs"
import { type IngestStatus, type JobReport, KEEPALIVE_MS, keepaliveStep, MAX_RUN_MS, type RunRecord } from "./run-state"

export const INGEST_CONTAINER_NAME = "ingest"

const RUN_KEY = "run"
const REPORT_KEY = "report"

const message = (error: unknown) => (error instanceof Error ? error.message : String(error))

export class IngestContainer extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
    // A restarted object has lost its exit watcher and the container's inactivity timeout: put both back.
    if (ctx.container?.running) this.hold(ctx.container)
  }

  /**
   * Start the container unless it is already running. `fallbackBaseUrl` is the
   * caller's own origin, used when API_BASE_URL isn't configured (a staging
   * deployment on workers.dev that nobody has pointed a variable at yet).
   */
  async run(fallbackBaseUrl?: string): Promise<{ started: boolean; reason?: string }> {
    const container = this.ctx.container
    if (!container) return { started: false, reason: "no container is attached to this Durable Object (local dev / tests)" }
    if (container.running) return { started: false, reason: "already running" }

    const baseUrl = config.apiBaseUrl || fallbackBaseUrl
    if (!baseUrl) return { started: false, reason: "API_BASE_URL is not set" }

    container.start({
      enableInternet: true,
      env: {
        API_BASE_URL: baseUrl,
        INGEST_TOKEN: config.ingestToken,
        NODE_ENV: config.env,
      },
    })
    await this.ctx.storage.put<RunRecord>(RUN_KEY, { startedAt: Date.now(), state: "running" })
    await this.ctx.storage.setAlarm(Date.now() + KEEPALIVE_MS)
    this.hold(container)
    logger.info(logNames.gtfs.ingest.start, { container: true })
    return { started: true }
  }

  /** The keep-alive: wakes the object while the job runs, closes the record once it has gone, stops a stuck run. */
  async alarm() {
    const container = this.ctx.container
    const step = keepaliveStep(await this.ctx.storage.get<RunRecord>(RUN_KEY), Boolean(container?.running), Date.now())
    switch (step.action) {
      case "rearm":
        await this.ctx.storage.setAlarm(Date.now() + KEEPALIVE_MS)
        return
      case "destroy":
        logger.error(logNames.gtfs.ingest.failed, { container: "timed out", error: step.record.error })
        await this.ctx.storage.put(RUN_KEY, step.record)
        await container?.destroy(new Error(step.record.error)).catch(() => {})
        return
      case "finish":
        await this.ctx.storage.put(RUN_KEY, step.record)
        return
      case "idle":
        return
    }
  }

  /** The job's own account of where it got to (POST /internal/ingest/report). */
  async report(report: JobReport): Promise<void> {
    await this.ctx.storage.put(REPORT_KEY, report)
    if (!report.ok) logger.error(logNames.gtfs.ingest.failed, { stage: report.stage, error: report.error, reportedBy: "job" })
  }

  /** How the last run went (GET /internal/ingest/status). */
  async status(): Promise<IngestStatus> {
    return {
      running: Boolean(this.ctx.container?.running),
      run: (await this.ctx.storage.get<RunRecord>(RUN_KEY)) ?? null,
      lastReport: (await this.ctx.storage.get<JobReport>(REPORT_KEY)) ?? null,
    }
  }

  /** Keep the container through the run and record how it ends. */
  private hold(container: Container) {
    // No port is ever opened to the job, so without this the runtime is free to stop it as soon as nobody is looking.
    this.ctx.waitUntil(
      container
        .setInactivityTimeout(MAX_RUN_MS)
        .catch((error) => logger.warn(logNames.gtfs.ingest.failed, { container: "inactivity timeout not set", error })),
    )
    this.ctx.waitUntil(
      container
        .monitor()
        .then(() => this.close("exited"))
        .catch((error) => this.close("crashed", message(error))),
    )
  }

  private async close(state: "exited" | "crashed", error?: string) {
    const record = await this.ctx.storage.get<RunRecord>(RUN_KEY)
    // A run the alarm already closed (timed out) keeps that verdict.
    if (record && record.state !== "running") return
    await this.ctx.storage.put<RunRecord>(RUN_KEY, {
      startedAt: record?.startedAt ?? Date.now(),
      state,
      endedAt: Date.now(),
      ...(error ? { error } : {}),
    })
    if (state === "crashed") logger.error(logNames.gtfs.ingest.failed, { error, container: "crashed" })
    else logger.info(logNames.gtfs.ingest.loaded, { container: "exited" })
  }
}

type IngestStub = {
  run(fallbackBaseUrl?: string): Promise<{ started: boolean; reason?: string }>
  report(report: JobReport): Promise<void>
  status(): Promise<IngestStatus>
}

const ingestObject = () => runtime().INGEST.getByName(INGEST_CONTAINER_NAME) as unknown as IngestStub

/** The cron's and the operator's entry point. */
export const startIngest = (fallbackBaseUrl?: string) => ingestObject().run(fallbackBaseUrl)

export const recordIngestReport = (report: JobReport) => ingestObject().report(report)

export const ingestStatus = () => ingestObject().status()
