/**
 * status-do.ts — the service-status gatherer, as a singleton Durable Object.
 *
 * What `bun run service-status` was on Railway: every few minutes it gathers
 * what the live feed cannot tell about the network's health and publishes it
 * to its storage, where the API reads it (state.ts) and lays it over the
 * status (status/service-status.ts):
 *
 * - announcements.ts: Israel Railways' published service updates, read into
 *   planned disruptions by a Claude model whenever they change;
 * - timetable.ts: Israel Railways' own timetable compared with the GTFS
 *   schedule, for trains gone missing (cancelled), lost stops or extra runs.
 *
 * Both are tasks on one alarm (utils/alarm-tasks.ts); the minute cron re-arms
 * it if it was ever lost. Both need the rail API (RAIL_URL, RAIL_API_KEY),
 * the announcements a model too (ANTHROPIC_API_KEY).
 */
import { DurableObject } from "cloudflare:workers"

import { config } from "../config"
import { logNames, logger } from "../logs"
import { isRailApiConfigured } from "../requests/rail-api"
import { bindRuntime, type Env } from "../runtime"
import { AlarmTasks } from "../utils/alarm-tasks"
import { isAnnouncementsConfigured, pollAnnouncements } from "./announcements"
import { ANNOUNCEMENTS_KEY, type AnnouncementsState, TIMETABLE_KEY } from "./state"
import { type TimetableCheck, runTimetableCheck } from "./timetable"

/** Refreshed every poll; the backstop that clears stale disruptions when the gatherer is gone for good. */
const ANNOUNCEMENTS_TTL_MS = 3 * 24 * 60 * 60_000
/** The check is only trusted while fresh (timetableStaleSeconds); the TTL just tidies up after the gatherer. */
const TIMETABLE_TTL_MS = 60 * 60_000
const MAX_BACKOFF_MS = 30 * 60_000

type Stamped<T> = { value: T; expiresAt: number }

let announcedIdle = false

export class ServiceStatusDO extends DurableObject<Env> {
  private readonly tasks = new AlarmTasks(this.ctx.storage, [
    {
      name: "announcements",
      everyMs: () => config.announcementsPollSeconds * 1000,
      maxBackoffMs: MAX_BACKOFF_MS,
      enabled: () => {
        const configured = isAnnouncementsConfigured()
        if (!configured && !announcedIdle) {
          announcedIdle = true
          logger.info(logNames.announcements.skipped)
        }
        return configured
      },
      run: () =>
        pollAnnouncements({
          previous: () => this.readStamped<AnnouncementsState>(ANNOUNCEMENTS_KEY),
          write: (state) => this.writeStamped(ANNOUNCEMENTS_KEY, state, ANNOUNCEMENTS_TTL_MS, logNames.announcements.writeFailed),
        }),
      log: { failed: logNames.announcements.extractFailed, recovered: logNames.announcements.recovered },
    },
    {
      name: "timetable",
      everyMs: () => config.timetableCheckSeconds * 1000,
      maxBackoffMs: MAX_BACKOFF_MS,
      initialDelayMs: 5_000,
      run: () =>
        runTimetableCheck({
          write: (check) => this.writeStamped(TIMETABLE_KEY, check, TIMETABLE_TTL_MS, logNames.timetableCheck.writeFailed),
        }),
      log: { failed: logNames.timetableCheck.failed, recovered: logNames.timetableCheck.recovered },
    },
  ])

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  // --- what the API and the cron call ------------------------------------------

  /** Start gathering (idempotent); false when the rail API isn't configured. */
  async ensureRunning(): Promise<boolean> {
    if (!isRailApiConfigured()) {
      logger.info(logNames.serviceStatus.disabled)
      return false
    }
    if ((await this.ctx.storage.getAlarm()) === null) {
      logger.info(logNames.serviceStatus.started, {
        announcementsEverySeconds: config.announcementsPollSeconds,
        timetableEverySeconds: config.timetableCheckSeconds,
        model: isAnnouncementsConfigured() ? config.anthropicModel : null,
      })
    }
    await this.tasks.ensureRunning()
    return true
  }

  /** What the model last read out of Israel Railways' updates; null before the first read (or once expired). */
  async getAnnouncements(): Promise<AnnouncementsState | null> {
    return this.readStamped<AnnouncementsState>(ANNOUNCEMENTS_KEY)
  }

  /** The latest comparison of Israel Railways' timetable with the schedule. */
  async getTimetableCheck(): Promise<TimetableCheck | null> {
    return this.readStamped<TimetableCheck>(TIMETABLE_KEY)
  }

  /** The tasks' schedules, for the debug routes. */
  async getTaskStatus() {
    return this.tasks.status()
  }

  /** Run one task now (tests, operator routes). */
  async runNow(name: "announcements" | "timetable"): Promise<unknown> {
    return this.tasks.runNow(name)
  }

  // --- the loop ----------------------------------------------------------------

  async alarm() {
    await this.tasks.onAlarm()
  }

  // --- storage with expiry (what redis' EX did) ---------------------------------

  private async writeStamped<T>(key: string, value: T, ttlMs: number, failedLog: string) {
    try {
      await this.ctx.storage.put<Stamped<T>>(key, { value, expiresAt: Date.now() + ttlMs })
    } catch (error) {
      logger.error(failedLog, { error, key })
    }
  }

  private async readStamped<T>(key: string): Promise<T | null> {
    const stamped = await this.ctx.storage.get<Stamped<T>>(key)
    if (!stamped || stamped.expiresAt <= Date.now()) return null
    return stamped.value
  }
}
