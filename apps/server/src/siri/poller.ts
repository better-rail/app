/**
 * poller.ts — the SIRI-SM poll loop.
 *
 * Every cycle: fetch stop monitoring for all rail stations (chunked,
 * sequential), correlate each visit to a GTFS trip, publish the snapshot +
 * debug state to redis, then schedule the next cycle. setTimeout-chaining
 * (never setInterval) makes overlapping cycles impossible; failures back off
 * exponentially and only state *transitions* are logged.
 *
 * Runs standalone via siri/main.ts (`bun run siri`) or in-process in the web
 * service when SIRI_POLLER_MODE=in-process (see index.ts).
 */
import { siriChunkSize, siriKey, siriPollSeconds, siriUrl } from "../data/config"
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
import { MatchedVisit, buildSnapshot, readSnapshot, writeRaw, writeSnapshot, writeStatus, writeUnmatched } from "./snapshot"
import { NormalizedVisit, SiriSnapshot, UnmatchedSample } from "./types"

const MAX_BACKOFF_MS = 300_000
const CHUNK_GAP_MS = 1_000
const MAX_UNMATCHED_SAMPLES = 50
const UNMATCHED_LOG_INTERVAL_MS = 10 * 60_000

let started = false
let currentFeedId: string | undefined
let stopCodeToRailId = new Map<string, number>()
let evictedStopCodes = new Set<string>()
let indexCache = new Map<string, CorrelationIndex>()

// The carry-forward baseline (last published snapshot). Seeded from redis once
// so a restart doesn't drop carried departed-visit state that's still in TTL.
let lastSnapshot: SiriSnapshot | null = null
let snapshotSeeded = false

let consecutiveFailures = 0
let lastSuccessAt: number | null = null
let lastAttemptAt: number | null = null
let lastError: string | null = null
let authorized: boolean | null = null
let lastCycle: Record<string, unknown> = {}
let lastUnmatchedLogAt = 0

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

const loadStopCodes = async (feedId: string) => {
  const { rows } = await query<{ rail_id: number; stop_code: string | null }>(
    `SELECT rail_id, stop_code FROM station_map WHERE feed_id = $1`,
    [feedId],
  )

  stopCodeToRailId = new Map()
  let missing = 0
  for (const row of rows) {
    if (row.stop_code) stopCodeToRailId.set(String(row.stop_code), Number(row.rail_id))
    else missing++
  }

  evictedStopCodes = new Set()
  indexCache = new Map()
  currentFeedId = feedId
  logger?.info(logNames.siri.feedSwap, { feedId, stopCodes: stopCodeToRailId.size, missingStopCodes: missing })
}

const ensureIndexes = async (feedId: string, visitDates: Set<string>) => {
  const needed = new Set<string>()
  for (const date of visitDates) {
    for (const d of [date, addDays(date, -1), addDays(date, 1)]) needed.add(`${feedId}#${d}`)
  }
  for (const key of needed) {
    if (!indexCache.has(key)) {
      const date = key.slice(key.indexOf("#") + 1)
      indexCache.set(key, buildCorrelationIndex(date, await loadDayTrips(feedId, date)))
    }
  }
  for (const key of indexCache.keys()) {
    if (!needed.has(key)) indexCache.delete(key)
  }
}

const topDelays = (snapshot: SiriSnapshot, limit = 20) =>
  Object.entries(snapshot.trains)
    .filter(([, t]) => !t.ended)
    .map(([train, t]) => ({ train, routeId: t.routeId, delayMin: t.latestDelayMin }))
    .sort((a, b) => b.delayMin - a.delayMin)
    .slice(0, limit)

const publishStatus = async (backoffMs: number) => {
  await writeStatus({
    updatedAt: Date.now(),
    authorized,
    lastSuccessAt,
    lastAttemptAt,
    lastError,
    consecutiveFailures,
    backoffMs,
    feedId: currentFeedId ?? null,
    stopCodes: stopCodeToRailId.size,
    evictedStopCodes: [...evictedStopCodes],
    ...lastCycle,
  })
}

const runCycle = async () => {
  lastAttemptAt = Date.now()

  const feed = await getActiveFeed()
  if (!feed) throw new Error("no active GTFS feed")
  if (feed.feedId !== currentFeedId) await loadStopCodes(feed.feedId)

  const codes = [...stopCodeToRailId.keys()].filter((c) => !evictedStopCodes.has(c))
  if (codes.length === 0) {
    logger?.error(logNames.siri.emptyStopCodes, { feedId: feed.feedId })
    throw new Error("no stop codes to monitor")
  }

  // Fetch all chunks sequentially; a failed chunk degrades the cycle instead of
  // failing it — trains appear at many stations, so holes usually self-heal.
  const chunks = chunk(codes, siriChunkSize)
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
      evictedStopCodes.add(badStop[1])
      logger?.warn(logNames.siri.badStop, { stopCode: badStop[1] })
    }
  }
  if (bodyErrors.some((e) => /not authorized/i.test(e))) {
    if (authorized !== false) logger?.error(logNames.siri.notAuthorized)
    authorized = false
  } else if (visits.length > 0) {
    authorized = true
  }

  // Correlate. Indexes are needed for every service date seen (±1 day for the
  // D±1 probe) and are cached across cycles until the dates roll over.
  const visitDates = new Set<string>()
  for (const v of visits) {
    const date = visitServiceDate(v)
    if (date) visitDates.add(date)
  }
  await ensureIndexes(feed.feedId, visitDates)
  const getIndex = (date: string) => indexCache.get(`${feed.feedId}#${date}`)

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
  const counterByPath = { "train-number": "matchedTrainNumber", primary: "matchedPrimary", fallback: "matchedFallback" } as const

  for (const v of visits) {
    const railId = stopCodeToRailId.get(v.monitoringRef)
    if (railId === undefined) {
      counters.unknownStopVisits++
      continue
    }
    if (v.arrivalStatus === "cancelled") counters.cancelledVisits++

    const result = matchJourney(v, getIndex, stopCodeToRailId)
    if (result.ok) {
      counters[counterByPath[result.path]]++
      matched.push({
        tripRef: result.tripRef,
        railId,
        expectedArrNaive: v.expectedArrival ? siriIsoToNaiveEpoch(v.expectedArrival) : null,
        status: v.arrivalStatus,
        platform: parsePlatform(v.arrivalPlatform),
        destRailId: v.destinationRef ? stopCodeToRailId.get(v.destinationRef) : undefined,
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

  if (!snapshotSeeded) {
    lastSnapshot = await readSnapshot()
    snapshotSeeded = true
  }
  const snapshot = buildSnapshot(matched, feed.feedId, naiveNowMs(), lastSnapshot)
  await writeSnapshot(snapshot)
  lastSnapshot = snapshot
  await writeUnmatched(unmatched)
  await writeRaw(rawChunks)

  // Persist observed platforms — the scheduled-platform source now that the
  // Israel Railways API is gone (the ingest bakes these into stop_times).
  const platformsRecorded = await recordObservedPlatforms(
    matched
      .filter((m) => m.platform !== undefined)
      .map((m) => ({ trainNumber: m.tripRef.trainNumber, railId: m.railId, platform: m.platform! })),
  )

  const unmatchedTotal = Object.values(counters.unmatchedByReason).reduce((a, b) => a + b, 0)
  if (unmatchedTotal > 0 && Date.now() - lastUnmatchedLogAt > UNMATCHED_LOG_INTERVAL_MS) {
    lastUnmatchedLogAt = Date.now()
    logger?.warn(logNames.siri.unmatchedJourneys, { count: unmatchedTotal, byReason: counters.unmatchedByReason })
  }

  lastCycle = {
    chunks: chunks.length,
    chunksFetched: rawChunks.length,
    visitsLastPoll: visits.length,
    trainsTracked: Object.keys(snapshot.trains).length,
    endedTrainsCarried: Object.values(snapshot.trains).filter((t) => t.ended).length,
    platformsRecorded,
    topDelays: topDelays(snapshot),
    ...counters,
  }
  lastError = bodyErrors.length > 0 ? redactKey(bodyErrors[0]) : null
}

const runLoop = async () => {
  let delayMs = siriPollSeconds * 1000
  try {
    await runCycle()
    if (consecutiveFailures > 0) logger?.info(logNames.siri.recovered, { afterFailures: consecutiveFailures })
    consecutiveFailures = 0
    lastSuccessAt = Date.now()
  } catch (error) {
    consecutiveFailures++
    lastError = redactKey(String((error as Error)?.message ?? error))
    if (consecutiveFailures === 1) logger?.error(logNames.siri.pollFailed, { error: lastError })
    delayMs = Math.min(siriPollSeconds * 1000 * 2 ** consecutiveFailures, MAX_BACKOFF_MS)
  }
  await publishStatus(delayMs).catch(() => undefined)
  setTimeout(runLoop, delayMs)
}

/** Start polling; no-op (returns false) when SIRI access isn't configured. */
export const startSiriPoller = (): boolean => {
  if (started) return true
  if (!siriUrl || !siriKey) {
    logger?.info(logNames.siri.disabled)
    return false
  }
  started = true
  logger?.info(logNames.siri.started, { pollSeconds: siriPollSeconds, chunkSize: siriChunkSize })
  void runLoop()
  return true
}
