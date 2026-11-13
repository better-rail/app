import { describe, expect, test } from "bun:test"

import {
  afterFailure,
  type JobReport,
  keepaliveStep,
  MAX_RUN_MS,
  MAX_START_ATTEMPTS,
  parseJobReport,
  reportForRun,
  type RunRecord,
} from "../../../src/ingest/run-state"

const running: RunRecord = { startedAt: 1_000_000, state: "running" }

describe("keepaliveStep", () => {
  test("keeps waking the object while the job runs", () => {
    expect(keepaliveStep(running, true, running.startedAt + 60_000)).toEqual({ action: "rearm" })
    // A running container found with no record gets one, so the run limit still counts against it
    expect(keepaliveStep(undefined, true, 5)).toEqual({ action: "rearm", record: { startedAt: 5, state: "running" } })
  })

  test("closes the record when the container has gone and nothing else did", () => {
    const now = running.startedAt + 240_000
    expect(keepaliveStep(running, false, now)).toEqual({
      action: "finish",
      record: { startedAt: running.startedAt, state: "exited", endedAt: now },
    })
  })

  test("leaves a closed record alone", () => {
    const crashed: RunRecord = { ...running, state: "crashed", endedAt: 2_000_000, error: "exit code 1" }
    expect(keepaliveStep(crashed, false, 3_000_000)).toEqual({ action: "idle" })
    expect(keepaliveStep(undefined, false, 3_000_000)).toEqual({ action: "idle" })
  })

  test("destroys a run that is still going after the limit", () => {
    const now = running.startedAt + MAX_RUN_MS + 1
    const step = keepaliveStep(running, true, now)
    expect(step).toMatchObject({ action: "destroy", record: { state: "timed-out", endedAt: now } })
    expect(keepaliveStep(running, true, running.startedAt + MAX_RUN_MS)).toEqual({ action: "rearm" })
  })

  test("nothing runs forever: a destroy that did not take is repeated, and the alarm stops once the container is gone", () => {
    const timedOut = (keepaliveStep(running, true, running.startedAt + MAX_RUN_MS + 1) as { record: RunRecord }).record
    const later = running.startedAt + MAX_RUN_MS + 20_001
    // Still running after the destroy: destroy again, keeping the time the limit was first hit
    expect(keepaliveStep(timedOut, true, later)).toMatchObject({
      action: "destroy",
      record: { state: "timed-out", endedAt: timedOut.endedAt },
    })
    // Gone: no further alarm
    expect(keepaliveStep(timedOut, false, later)).toEqual({ action: "idle" })
    // A normal exit ends the alarms too, whether the watcher or the alarm closed the record
    expect(keepaliveStep({ ...running, state: "exited", endedAt: later }, false, later)).toEqual({ action: "idle" })
    expect(keepaliveStep(running, false, later).action).toBe("finish")
  })
})

describe("no container instance available", () => {
  const NO_INSTANCE = "There is no container instance that can be provided to this Durable Object, try again later"
  const first: RunRecord = { startedAt: 1_000_000, state: "running", attempts: 1, baseUrl: "https://api.test" }

  test("waits for an instance and starts again, keeping the origin the job posts back to", () => {
    const waiting = afterFailure(first, NO_INSTANCE, 1_000_800)
    expect(waiting).toEqual({
      startedAt: 1_000_000,
      state: "waiting-for-instance",
      attempts: 1,
      baseUrl: "https://api.test",
      error: NO_INSTANCE,
    })
    expect(keepaliveStep(waiting, false, 1_060_800)).toEqual({
      action: "start",
      record: { ...waiting, state: "running", attempts: 2 },
    })
  })

  test("gives up after the last attempt, and never retries a real crash", () => {
    const last = afterFailure({ ...first, attempts: MAX_START_ATTEMPTS }, NO_INSTANCE, 2_000_000)
    expect(last).toMatchObject({ state: "crashed", endedAt: 2_000_000, attempts: MAX_START_ATTEMPTS, error: NO_INSTANCE })
    expect(keepaliveStep(last, false, 2_060_000)).toEqual({ action: "idle" })

    const crash = afterFailure(first, "container exited with code 1", 1_200_000)
    expect(crash).toMatchObject({ state: "crashed", endedAt: 1_200_000, error: "container exited with code 1" })
    expect(afterFailure(undefined, "boom", 5)).toMatchObject({ startedAt: 5, state: "crashed", attempts: 1 })
  })
})

describe("reportForRun", () => {
  const loaded: JobReport = { at: 900_000, ok: true, stage: "loaded" }

  test("hides a report filed before the last run started", () => {
    // An earlier success must not sit beside a later run that died before it could report
    const crashed: RunRecord = { ...running, state: "crashed", endedAt: 1_100_000, error: "exit code 137" }
    expect(reportForRun(crashed, loaded)).toBeNull()
    expect(reportForRun(running, loaded)).toBeNull()
  })

  test("keeps a report from the last run, and one with no container run at all", () => {
    const exited: RunRecord = { ...running, state: "exited", endedAt: 1_300_000 }
    const fromRun: JobReport = { at: 1_250_000, ok: false, stage: "downloading the feed", error: "HTTP 403" }
    expect(reportForRun(exited, fromRun)).toEqual(fromRun)
    expect(reportForRun(exited, { ...loaded, at: exited.startedAt })).toEqual({ ...loaded, at: exited.startedAt })
    expect(reportForRun(null, loaded)).toEqual(loaded)
    expect(reportForRun(exited, null)).toBeNull()
  })
})

describe("parseJobReport", () => {
  test("takes the job's stage and error", () => {
    expect(parseJobReport({ ok: false, stage: "downloading the feed", error: "Download failed: HTTP 403" }, 42)).toEqual({
      at: 42,
      ok: false,
      stage: "downloading the feed",
      error: "Download failed: HTTP 403",
    })
    expect(parseJobReport({ ok: true, stage: "loaded" }, 7)).toEqual({ at: 7, ok: true, stage: "loaded" })
  })

  test("refuses anything else and caps what it stores", () => {
    for (const body of [null, "x", {}, { ok: "yes", stage: "loaded" }, { ok: true }, { ok: true, stage: "" }]) {
      expect(parseJobReport(body, 1)).toBeNull()
    }
    const long = parseJobReport({ ok: false, stage: "s".repeat(500), error: "e".repeat(10_000) }, 1)!
    expect(long.stage).toHaveLength(60)
    expect(long.error).toHaveLength(2000)
  })
})
