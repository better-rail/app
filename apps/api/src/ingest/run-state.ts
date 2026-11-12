/**
 * run-state.ts — what the ingest container's Durable Object remembers about a run.
 *
 * The job runs for minutes with nobody calling the object, and its output lands
 * in the container's own log. The object therefore keeps itself awake on an
 * alarm while the job runs (an idle object is evicted, and the runtime may stop
 * a container nobody holds on to), records how the run ended, and stores the
 * job's own last report, so `GET /internal/ingest/status` answers "did last
 * night's ingest work, and if not, where did it stop" without the dashboard.
 */

/** How often the object wakes itself while the job runs. Well under the idle time after which an object is evicted. */
export const KEEPALIVE_MS = 20_000

/** A run longer than this is stuck (a normal one takes a few minutes); the container is destroyed. */
export const MAX_RUN_MS = 30 * 60_000

export type RunState = "running" | "exited" | "crashed" | "timed-out"

export type RunRecord = {
  startedAt: number
  state: RunState
  endedAt?: number
  /** Why the container crashed or was destroyed. */
  error?: string
}

/** What the job itself said last (POST /internal/ingest/report): the stage it reached and, on failure, why. */
export type JobReport = {
  at: number
  ok: boolean
  stage: string
  error?: string
}

export type IngestStatus = { running: boolean; run: RunRecord | null; lastReport: JobReport | null }

export type KeepaliveStep =
  | { action: "rearm" }
  | { action: "finish"; record: RunRecord }
  | { action: "destroy"; record: RunRecord }
  | { action: "idle" }

/** The alarm's decision: keep waking while the job runs, close the record when it has gone, stop a stuck one. */
export const keepaliveStep = (record: RunRecord | undefined, containerRunning: boolean, nowMs: number): KeepaliveStep => {
  if (!containerRunning) {
    // The exit watcher normally closes the record; this covers an object that restarted and lost its watcher.
    if (record?.state === "running") return { action: "finish", record: { ...record, state: "exited", endedAt: nowMs } }
    return { action: "idle" }
  }
  if (record && nowMs - record.startedAt > MAX_RUN_MS) {
    return {
      action: "destroy",
      record: { ...record, state: "timed-out", endedAt: nowMs, error: `still running after ${MAX_RUN_MS / 60_000} minutes` },
    }
  }
  return { action: "rearm" }
}

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : undefined)

/** A job report from an untrusted-shape JSON body; null when it isn't one. */
export const parseJobReport = (body: unknown, nowMs: number): JobReport | null => {
  if (!body || typeof body !== "object") return null
  const { ok, stage, error } = body as Record<string, unknown>
  const stageText = text(stage, 60)
  if (typeof ok !== "boolean" || !stageText) return null
  const errorText = text(error, 2000)
  return { at: nowMs, ok, stage: stageText, ...(errorText ? { error: errorText } : {}) }
}
