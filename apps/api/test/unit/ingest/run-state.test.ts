import { describe, expect, test } from "bun:test"

import {
  type JobReport,
  keepaliveStep,
  MAX_RUN_MS,
  parseJobReport,
  reportForRun,
  type RunRecord,
} from "../../../src/ingest/run-state"

const running: RunRecord = { startedAt: 1_000_000, state: "running" }

describe("keepaliveStep", () => {
  test("keeps waking the object while the job runs", () => {
    expect(keepaliveStep(running, true, running.startedAt + 60_000)).toEqual({ action: "rearm" })
    // An object that restarted before the record was written still holds on to a running container
    expect(keepaliveStep(undefined, true, 5)).toEqual({ action: "rearm" })
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
