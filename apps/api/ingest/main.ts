/**
 * main.ts — the GTFS ingest job: the half of the pipeline that needs a real
 * filesystem and an unmetered CPU. Runs as a one-shot Cloudflare Container
 * (ingest/Dockerfile) or on a laptop: `bun run ingest` from apps/api.
 *
 * Flow: ask the Worker for the active feed -> download the MOT zip (unless
 * --gtfs points at an extracted feed) -> checksum idempotency -> parse the rail
 * subset -> match stations (abort if a traversed station is unmapped) -> build
 * the payload -> POST it gzip'd to the Worker, which loads it into D1 and swaps
 * the active feed. The Worker's reply (feed id, counts, pruned feeds, warnings)
 * is printed and the process exits non-zero on any failure.
 *
 * Flags:  --gtfs <dir>   use an extracted feed (checksum of its stop_times.txt)
 *         --out <file>   write the payload JSON to a file instead of posting
 *         --target <url> Worker base URL (default API_BASE_URL)
 * Env:    INGEST_TOKEN   bearer token for the Worker's /internal routes
 */
import os from "os"
import fs from "fs"
import path from "path"
import crypto from "crypto"

import { parseRailFeed } from "./parse"
import { matchStations } from "./station-match"
import { downloadFeed, extractFeed } from "./download"
import { buildPayload } from "./build-payload"
import { encodePayload, toWire, type RailFeedPayload } from "../src/ingest/payload"

const log = (message: string, meta?: unknown) => console.log(`[ingest] ${message}${meta ? " " + JSON.stringify(meta) : ""}`)

const flag = (name: string): string | null => {
  const idx = process.argv.indexOf(name)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const sha256 = (filePath: string): string => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")

type ActiveFeed = { feedId: string; checksum: string; feedEndDate: string | null }

type Target = { baseUrl: string; token: string }

const authHeaders = (target: Target) => ({ Authorization: `Bearer ${target.token}` })

const fetchActiveFeed = async (target: Target): Promise<ActiveFeed | null> => {
  const res = await fetch(`${target.baseUrl}/internal/ingest/active`, {
    headers: authHeaders(target),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`GET /internal/ingest/active failed: HTTP ${res.status} ${await res.text()}`)
  const body = (await res.json()) as ActiveFeed | null
  return body && body.feedId ? body : null
}

const postPayload = async (target: Target, payload: RailFeedPayload): Promise<unknown> => {
  const body = await encodePayload(payload)
  log(`posting payload`, { gzipBytes: body.byteLength })
  const res = await fetch(`${target.baseUrl}/internal/ingest`, {
    method: "POST",
    // application/gzip rather than application/json: the Worker reads the raw body itself (and the
    // edge must not try to inflate it); the gzip magic bytes tell the decoder what it is.
    headers: { ...authHeaders(target), "Content-Type": "application/gzip", "Content-Encoding": "gzip" },
    body,
    // A load runs thousands of D1 statements; give the Worker room before giving up.
    signal: AbortSignal.timeout(10 * 60_000),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`POST /internal/ingest failed: HTTP ${res.status} ${text}`)
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

const resolveTarget = (): Target => {
  const baseUrl = (flag("--target") ?? process.env.API_BASE_URL ?? "").replace(/\/+$/, "")
  const token = process.env.INGEST_TOKEN ?? ""
  if (!baseUrl) throw new Error("No target: pass --target <url> or set API_BASE_URL")
  if (!token) throw new Error("INGEST_TOKEN is not set")
  return { baseUrl, token }
}

const ingest = async (workDir: string) => {
  const outFile = flag("--out")
  const target = outFile ? null : resolveTarget()
  const active = target ? await fetchActiveFeed(target) : null
  if (active) log(`active feed ${active.feedId}`, { checksum: active.checksum, feedEndDate: active.feedEndDate })

  let gtfsDir = flag("--gtfs")
  let checksum: string

  if (gtfsDir) {
    log(`using existing feed at ${gtfsDir}`)
    // Hash stop_times so re-runs on the same extract are idempotent.
    checksum = sha256(path.join(gtfsDir, "stop_times.txt"))
  } else {
    const zipPath = path.join(workDir, "feed.zip")
    log("downloading feed…")
    await downloadFeed(zipPath)
    checksum = sha256(zipPath)
    gtfsDir = path.join(workDir, "extracted")
  }

  if (active && active.checksum === checksum) {
    log("feed unchanged since last ingest (checksum match) — nothing to do")
    return
  }

  if (!flag("--gtfs")) {
    log("extracting…")
    await extractFeed(path.join(workDir, "feed.zip"), gtfsDir)
  }

  log("parsing rail subset…")
  const feed = await parseRailFeed(gtfsDir)
  log("parsed", {
    routes: feed.routes.size,
    trips: feed.trips.size,
    stopTimes: feed.stopTimes.length,
    stations: feed.stationNodes.size,
    days: new Set(feed.calendarDates.map((c) => c.serviceDate)).size,
  })

  const match = matchStations([...feed.stationNodes.values()])
  const payload = buildPayload(feed, match, checksum)
  for (const warning of payload.warnings) log(`⚠️ ${warning}`)

  if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify(toWire(payload)))
    log(`wrote payload to ${outFile}`, { bytes: fs.statSync(outFile).size })
    return
  }

  const reply = await postPayload(target!, payload)
  log("worker reply", reply)
}

const main = async () => {
  log("started")
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "gtfs-"))
  try {
    await ingest(workDir)
  } finally {
    // Always clean up the temp dir, even if the ingest threw (download/parse/HTTP
    // error, unmapped station) — otherwise extracted feeds pile up in /tmp.
    fs.rmSync(workDir, { recursive: true, force: true })
    log("done")
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[ingest] FAILED:", error)
    process.exit(1)
  })
