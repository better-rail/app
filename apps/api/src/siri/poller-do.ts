/**
 * poller-do.ts — the SIRI-SM poll loop, as a singleton Durable Object.
 *
 * What `bun run siri` was on Railway: every cycle fetch stop monitoring for
 * all rail stations (chunked, sequential), correlate each visit to a GTFS
 * trip, publish the snapshot + debug state, then schedule the next cycle. The
 * cycle is a Durable Object alarm instead of a setTimeout chain, so it is
 * single-flight by construction and survives deploys; the minute cron in
 * index.ts is only a watchdog that re-arms the alarm if it was ever lost.
 * Failures back off exponentially and only state *transitions* are logged.
 *
 * The MOT API answers one allow-listed egress IP, so the fetch goes through
 * the egress proxy (utils/egress.ts); nothing else here differs from the Bun
 * poller.
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, type Env } from "../runtime"
import { config } from "../config"
import { getActiveFeed, query } from "../db"
import { logNames, logger } from "../logs"
import { loadDayTrips } from "../requests/gtfs-route-api"
import { addDays } from "../utils/gtfs-time"
import { fetchStopMonitoring, redactKey } from "./client"
import {
  CorrelationIndex,
  buildCorrelationIndex,
  matchJourney,
  naiveNowMs,
  siriIsoToNaiveEpoch,
  visitServiceDate,
} from "./correlate"
import { recordObservedPlatforms } from "./platform-store"
import { MatchedVisit, buildSnapshot } from "./snapshot"
import { NormalizedVisit, SiriSnapshot, UnmatchedSample } from "./types"

const MAX_BACKOFF_MS = 300_000
// MOT's API often times out for a cycle or two; only a sustained outage is an error.
const OUTAGE_FAILURES = 3
const CHUNK_GAP_MS = 1_000
const MAX_UNMATCHED_SAMPLES = 50
const UNMATCHED_LOG_INTERVAL_MS = 10 * 60_000

// Storage keys. The snapshot is the only one the API reads on the hot path.
export const SNAPSHOT_KEY = "siri:snapshot"
export const STATUS_KEY = "siri:status"
export const RAW_KEY = "siri:raw"
export const UNMATCHED_KEY = "siri:unmatched"
const NEXT_CYCLE_KEY = "siri:nextCycleAt"

// The lookup already refuses snapshots older than siriStaleSeconds; the TTL is
// just the backstop that clears state when the poller is gone for good.
const SNAPSHOT_TTL_MS = 900_000
const DEBUG_TTL_MS = 1_800_000

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += Math.max(1, size)) out.push(arr.slice(i, i + Math.max(1, size)))
  return out
}

/** ArrivalPlatformName -> platform number; only positive numbers are overrides. */
const parsePlatform = (name?: string): number | undefined => {
  const n = name === undefined ? NaN : parseInt(name, 10)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const topDelays = (snapshot: SiriSnapshot, limit = 20) =>
  Object.entries(snapshot.trains)
    .filter(([, t]) => !t.ended)
    .map(([train, t]) => ({ train, routeId: t.routeId, delayMin: t.latestDelayMin }))
    .sort((a, b) => b.delayMin - a.delayMin)
    .slice(0, limit)

type Stamped<T> = { value: T; expiresAt: number }

export class SiriPollerDO extends DurableObject<Env> {
  // Per-feed correlation state; rebuilt when the active feed changes.
  private currentFeedId: string | undefined
  private stopCodeToRailId = new Map<string, number>()
  private evictedStopCodes = new Set<string>()
  private indexCache = new Map<string, CorrelationIndex>()

  // The carry-forward baseline (last published snapshot). Seeded from storage
  // once so a restart doesn't drop carried departed-visit state that's still in TTL.
  private lastSnapshot: SiriSnapshot | null = null
  private snapshotSeeded = false

  private consecutiveFailures = 0
  private lastSuccessAt: number | null = null
  private lastAttemptAt: number | null = null
  private lastError: string | null = null
  private authorized: boolean | null = null
  private lastCycle: Record<string, unknown> = {}
  private lastUnmatchedLogAt = 0
  private cycling = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  // --- what the API and the cron call ------------------------------------------

  /** Start polling (idempotent); false when SIRI access isn't configured. */
  async ensureRunning(): Promise<boolean> {
    if (!config.siriUrl || !config.siriKey) {
      logger.info(logNames.siri.disabled)
      return false
    }
    const alarm = await this.ctx.storage.getAlarm()
    if (alarm === null) {
      logger.info(logNames.siri.started, { pollSeconds: config.siriPollSeconds, chunkSize: config.siriChunkSize })
      await this.ctx.storage.setAlarm(Date.now() + 1000)
    }
    return true
  }

  /** The latest snapshot, or null when none was published (or it has expired). */
  async getSnapshot(): Promise<SiriSnapshot | null> {
    return this.readStamped<SiriSnapshot>(SNAPSHOT_KEY)
  }

  /** The debug state the token-guarded /siri routes expose. */
  async getDebugState(): Promise<{ status: Record<string, unknown> | null; snapshot: SiriSnapshot | null }> {
    const [status, snapshot] = await Promise.all([this.readStamped<Record<string, unknown>>(STATUS_KEY), this.getSnapshot()])
    return { status, snapshot }
  }

  /** The last poll's raw SIRI chunk bodies, as JSON text ("[]" when none). */
  async getRaw(): Promise<string> {
    return (await this.readStamped<string>(RAW_KEY)) ?? "[]"
  }

  async getUnmatched(): Promise<string> {
    const samples = await this.readStamped<UnmatchedSample[]>(UNMATCHED_KEY)
    return JSON.stringify(samples ?? [])
  }

  // --- the loop ----------------------------------------------------------------

  async alarm() {
    if (this.cycling) return
    this.cycling = true
    let delayMs = config.siriPollSeconds * 1000
    try {
      await this.runCycle()
      if (this.consecutiveFailures > 0) logger.info(logNames.siri.recovered, { afterFailures: this.consecutiveFailures })
      this.consecutiveFailures = 0
      this.lastSuccessAt = Date.now()
    } catch (error) {
      this.consecutiveFailures++
      this.lastError = redactKey(String((error as Error)?.message ?? error))
      if (this.consecutiveFailures === 1) logger.warn(logNames.siri.pollFailed, { error: this.lastError })
      if (this.consecutiveFailures === OUTAGE_FAILURES) {
        logger.error(logNames.siri.outage, { error: this.lastError, failures: this.consecutiveFailures })
      }
      delayMs = Math.min(config.siriPollSeconds * 1000 * 2 ** this.consecutiveFailures, MAX_BACKOFF_MS)
    } finally {
      this.cycling = false
    }
    await this.publishStatus(delayMs).catch(() => undefined)
    const nextCycleAt = Date.now() + delayMs
    await this.ctx.storage.put(NEXT_CYCLE_KEY, nextCycleAt)
    await this.ctx.storage.setAlarm(nextCycleAt)
  }

  private async runCycle() {
    this.lastAttemptAt = Date.now()

    const feed = await getActiveFeed()
    if (!feed) throw new Error("no active GTFS feed")
    if (feed.feedId !== this.currentFeedId) await this.loadStopCodes(feed.feedId)

    const codes = [...this.stopCodeToRailId.keys()].filter((c) => !this.evictedStopCodes.has(c))
    if (codes.length === 0) {
      logger.error(logNames.siri.emptyStopCodes, { feedId: feed.feedId })
      throw new Error("no stop codes to monitor")
    }

    // Fetch all chunks sequentially; a failed chunk degrades the cycle instead of
    // failing it — trains appear at many stations, so holes usually self-heal.
    const chunks = chunk(codes, config.siriChunkSize)
    const visits: NormalizedVisit[] = []
    const bodyErrors: string[] = []
    const rawChunks: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await sleep(CHUNK_GAP_MS)
      try {
        const res = await fetchStopMonitoring(chunks[i])
        visits.push(...res.visits)
        bodyErrors.push(...res.errors)
        rawChunks.push(res.rawBody)
      } catch (error) {
        bodyErrors.push(String((error as Error)?.message ?? error))
      }
    }
    if (rawChunks.length === 0) throw new Error(bodyErrors[0] ?? "all SIRI requests failed")

    for (const err of bodyErrors) {
      const badStop = /No such stop:?\s*([\w-]+)/i.exec(err)
      if (badStop) {
        this.evictedStopCodes.add(badStop[1])
        logger.warn(logNames.siri.badStop, { stopCode: badStop[1] })
      }
    }
    if (bodyErrors.some((e) => /not authorized/i.test(e))) {
      if (this.authorized !== false) logger.error(logNames.siri.notAuthorized)
      this.authorized = false
    } else if (visits.length > 0) {
      this.authorized = true
    }

    // Correlate. Indexes are needed for every service date seen (±1 day for the
    // D±1 probe) and are cached across cycles until the dates roll over.
    const visitDates = new Set<string>()
    for (const v of visits) {
      const date = visitServiceDate(v)
      if (date) visitDates.add(date)
    }
    await this.ensureIndexes(feed.feedId, visitDates)
    const getIndex = (date: string) => this.indexCache.get(`${feed.feedId}#${date}`)

    const matched: MatchedVisit[] = []
    const unmatched: UnmatchedSample[] = []
    const counters = {
      matchedTrainNumber: 0,
      matchedPrimary: 0,
      matchedFallback: 0,
      unknownStopVisits: 0,
      cancelledVisits: 0,
      unmatchedByReason: {} as Record<string, number>,
    }
    const counterByPath = {
      "train-number": "matchedTrainNumber",
      primary: "matchedPrimary",
      fallback: "matchedFallback",
    } as const

    for (const v of visits) {
      const railId = this.stopCodeToRailId.get(v.monitoringRef)
      if (railId === undefined) {
        counters.unknownStopVisits++
        continue
      }
      if (v.arrivalStatus === "cancelled") counters.cancelledVisits++

      const result = matchJourney(v, getIndex, this.stopCodeToRailId)
      if (result.ok) {
        counters[counterByPath[result.path]]++
        matched.push({
          tripRef: result.tripRef,
          railId,
          expectedArrNaive: v.expectedArrival ? siriIsoToNaiveEpoch(v.expectedArrival) : null,
          status: v.arrivalStatus,
          platform: parsePlatform(v.arrivalPlatform),
          destRailId: v.destinationRef ? this.stopCodeToRailId.get(v.destinationRef) : undefined,
          location: v.location,
          vehicleRef: v.vehicleRef,
        })
      } else {
        counters.unmatchedByReason[result.reason] = (counters.unmatchedByReason[result.reason] ?? 0) + 1
        if (unmatched.length < MAX_UNMATCHED_SAMPLES) {
          unmatched.push({
            reason: result.reason,
            monitoringRef: v.monitoringRef,
            lineRef: v.lineRef,
            directionRef: v.directionRef,
            dataFrameRef: v.dataFrameRef,
            datedVehicleJourneyRef: v.datedVehicleJourneyRef,
            publishedLineName: v.publishedLineName,
            originRef: v.originRef,
            destinationRef: v.destinationRef,
            originAimedDeparture: v.originAimedDeparture,
          })
        }
      }
    }

    if (!this.snapshotSeeded) {
      this.lastSnapshot = await this.getSnapshot()
      this.snapshotSeeded = true
    }
    const snapshot = buildSnapshot(matched, feed.feedId, naiveNowMs(), this.lastSnapshot)
    await this.writeStamped(SNAPSHOT_KEY, snapshot, SNAPSHOT_TTL_MS)
    this.lastSnapshot = snapshot
    await this.writeStamped(UNMATCHED_KEY, unmatched, DEBUG_TTL_MS)
    await this.writeRaw(rawChunks)

    // Persist observed platforms — the scheduled-platform source now that the
    // Israel Railways API is gone (the ingest bakes these into stop_times).
    const platformsRecorded = await recordObservedPlatforms(
      matched
        .filter((m) => m.platform !== undefined)
        .map((m) => ({ trainNumber: m.tripRef.trainNumber, railId: m.railId, platform: m.platform! })),
    )

    const unmatchedTotal = Object.values(counters.unmatchedByReason).reduce((a, b) => a + b, 0)
    if (unmatchedTotal > 0 && Date.now() - this.lastUnmatchedLogAt > UNMATCHED_LOG_INTERVAL_MS) {
      this.lastUnmatchedLogAt = Date.now()
      logger.warn(logNames.siri.unmatchedJourneys, { count: unmatchedTotal, byReason: counters.unmatchedByReason })
    }

    this.lastCycle = {
      chunks: chunks.length,
      chunksFetched: rawChunks.length,
      visitsLastPoll: visits.length,
      trainsTracked: Object.keys(snapshot.trains).length,
      endedTrainsCarried: Object.values(snapshot.trains).filter((t) => t.ended).length,
      platformsRecorded,
      topDelays: topDelays(snapshot),
      ...counters,
    }
    this.lastError = bodyErrors.length > 0 ? redactKey(bodyErrors[0]) : null
  }

  private async loadStopCodes(feedId: string) {
    const { rows } = await query<{ rail_id: number; stop_code: string | null }>(
      `SELECT rail_id, stop_code FROM station_map WHERE feed_id = ?`,
      [feedId],
    )

    this.stopCodeToRailId = new Map()
    let missing = 0
    for (const row of rows) {
      if (row.stop_code) this.stopCodeToRailId.set(String(row.stop_code), Number(row.rail_id))
      else missing++
    }

    this.evictedStopCodes = new Set()
    this.indexCache = new Map()
    this.currentFeedId = feedId
    logger.info(logNames.siri.feedSwap, { feedId, stopCodes: this.stopCodeToRailId.size, missingStopCodes: missing })
  }

  private async ensureIndexes(feedId: string, visitDates: Set<string>) {
    const needed = new Set<string>()
    for (const date of visitDates) {
      for (const d of [date, addDays(date, -1), addDays(date, 1)]) needed.add(`${feedId}#${d}`)
    }
    for (const key of needed) {
      if (!this.indexCache.has(key)) {
        const date = key.slice(key.indexOf("#") + 1)
        this.indexCache.set(key, buildCorrelationIndex(date, await loadDayTrips(feedId, date)))
      }
    }
    for (const key of this.indexCache.keys()) {
      if (!needed.has(key)) this.indexCache.delete(key)
    }
  }

  private async publishStatus(backoffMs: number) {
    await this.writeStamped(
      STATUS_KEY,
      {
        updatedAt: Date.now(),
        authorized: this.authorized,
        lastSuccessAt: this.lastSuccessAt,
        lastAttemptAt: this.lastAttemptAt,
        lastError: this.lastError,
        consecutiveFailures: this.consecutiveFailures,
        backoffMs,
        feedId: this.currentFeedId ?? null,
        stopCodes: this.stopCodeToRailId.size,
        evictedStopCodes: [...this.evictedStopCodes],
        ...this.lastCycle,
      },
      DEBUG_TTL_MS,
    )
  }

  /** Keep the last poll's raw chunk bodies for fixture capture, capped in size. */
  private writeRaw(rawChunks: string[], capBytes = 4_000_000) {
    const kept: { chunk: number; truncated: boolean; body: string }[] = []
    let budget = capBytes
    for (let i = 0; i < rawChunks.length; i++) {
      const body = rawChunks[i].slice(0, Math.max(0, budget))
      kept.push({ chunk: i, truncated: body.length < rawChunks[i].length, body })
      budget -= body.length
      if (budget <= 0) break
    }
    return this.writeStamped(RAW_KEY, JSON.stringify(kept), DEBUG_TTL_MS)
  }

  // --- storage with expiry (what redis' EX did) ------------------------------------

  private async writeStamped<T>(key: string, value: T, ttlMs: number) {
    try {
      await this.ctx.storage.put<Stamped<T>>(key, { value, expiresAt: Date.now() + ttlMs })
    } catch (error) {
      logger.error(logNames.siri.snapshotWriteFailed, { error, key })
    }
  }

  private async readStamped<T>(key: string): Promise<T | null> {
    const stamped = await this.ctx.storage.get<Stamped<T>>(key)
    if (!stamped || stamped.expiresAt <= Date.now()) return null
    return stamped.value
  }
}
