/**
 * alerts-do.ts — push subscriptions and their watchers, as a singleton Durable Object.
 *
 * Holds what every device asked to hear about — the station alerts (a device's
 * stations and lines) and the Delay Notifications (the trains it guards) — and
 * what each was told so far, and runs the two checks that push about them on
 * its alarm (utils/alarm-tasks.ts): station-alerts/watcher.ts and
 * delay-guards/watcher.ts. The routes write subscriptions over RPC; the minute
 * cron re-arms the alarm if it was ever lost.
 *
 * Shared state and real riders' push tokens, so like ride tracking it is
 * opt-in: STATION_ALERTS_ENABLED=false (Previews, local runs) closes the routes
 * and stops the checks.
 */
import { DurableObject } from "cloudflare:workers"

import { config } from "../config"
import { type DelayGuardStore, createDelayGuardStore, delayGuardItems } from "../delay-guards/store"
import { type GuardCheckSummary, runDelayGuardsCheck } from "../delay-guards/watcher"
import { logNames, logger } from "../logs"
import { bindRuntime, type Env } from "../runtime"
import { type StationAlertStore, createStationAlertStore, stationAlertItems } from "../station-alerts/store"
import { type CheckSummary, runStationAlertsCheck } from "../station-alerts/watcher"
import type { DelayGuardSubscription } from "../types/delay-guards"
import type { StationAlertSubscription } from "../types/station-alerts"
import { AlarmTasks } from "../utils/alarm-tasks"
import type { SubscriptionStore } from "../utils/subscription-store"

/** The alerts Durable Object's name — there is exactly one. */
export const ALERTS_NAME = "alerts"

const MAX_BACKOFF_MS = 10 * 60_000

type Items<S, I> = {
  itemsOf: (subscription: S) => I[]
  keyOf: (item: I) => string
  withItems: (subscription: S, items: I[]) => S
}

/**
 * Replace the device's whole subscription. The app sends its full list every time; one entry
 * per key (the last wins), and what the device was told so far is kept only for the items that
 * stay, so re-adding one later starts it afresh.
 */
const replaceSubscription = async <S extends { token: string; provider: string }, I, M>(
  store: SubscriptionStore<S & { updatedAt: string }, Record<string, M>>,
  items: Items<S, I>,
  subscription: S,
  subscribedLog: string,
) => {
  const byKey = new Map(items.itemsOf(subscription).map((item) => [items.keyOf(item), item]))
  const kept = [...byKey.values()]
  await store.writeSubscription({ ...items.withItems(subscription, kept), updatedAt: new Date().toISOString() })

  const memory = await store.readMemory(subscription.token)
  if (memory) {
    const remaining = Object.fromEntries(Object.entries(memory).filter(([key]) => byKey.has(key)))
    if (Object.keys(remaining).length !== Object.keys(memory).length) await store.writeMemory(subscription.token, remaining)
  }
  logger.info(subscribedLog, { provider: subscription.provider, items: kept.length })
}

export class AlertsDO extends DurableObject<Env> {
  private readonly stationAlerts: StationAlertStore = createStationAlertStore(this.ctx.storage)
  private readonly delayGuards: DelayGuardStore = createDelayGuardStore(this.ctx.storage)

  private readonly tasks = new AlarmTasks(this.ctx.storage, [
    {
      name: "station-alerts",
      everyMs: () => config.stationAlertsCheckSeconds * 1000,
      maxBackoffMs: MAX_BACKOFF_MS,
      initialDelayMs: 5_000,
      enabled: () => config.stationAlertsEnabled,
      run: () => runStationAlertsCheck(this.stationAlerts),
      log: { failed: logNames.stationAlerts.checkFailed, recovered: logNames.stationAlerts.recovered },
    },
    {
      name: "delay-guards",
      everyMs: () => config.stationAlertsCheckSeconds * 1000,
      maxBackoffMs: MAX_BACKOFF_MS,
      initialDelayMs: 8_000,
      enabled: () => config.stationAlertsEnabled,
      run: () => runDelayGuardsCheck(this.delayGuards),
      log: { failed: logNames.delayGuards.checkFailed, recovered: logNames.delayGuards.recovered },
    },
  ])

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  // --- what the API and the cron call ------------------------------------------

  /** Start watching (idempotent); false while the feature is off. */
  async ensureRunning(): Promise<boolean> {
    if (!config.stationAlertsEnabled) return false
    if ((await this.ctx.storage.getAlarm()) === null) {
      logger.info(logNames.stationAlerts.started, { everySeconds: config.stationAlertsCheckSeconds })
    }
    await this.tasks.ensureRunning()
    return true
  }

  /** PUT /station-alerts */
  async subscribeStationAlerts(subscription: StationAlertSubscription): Promise<void> {
    await replaceSubscription(this.stationAlerts, stationAlertItems, subscription, logNames.stationAlerts.subscribed)
  }

  /** DELETE /station-alerts: forget the device. */
  async unsubscribeStationAlerts(token: string): Promise<void> {
    await this.stationAlerts.removeSubscription(token)
    logger.info(logNames.stationAlerts.unsubscribed)
  }

  /** PUT /delay-guards */
  async subscribeDelayGuards(subscription: DelayGuardSubscription): Promise<void> {
    await replaceSubscription(this.delayGuards, delayGuardItems, subscription, logNames.delayGuards.subscribed)
  }

  /** DELETE /delay-guards: forget the device. */
  async unsubscribeDelayGuards(token: string): Promise<void> {
    await this.delayGuards.removeSubscription(token)
    logger.info(logNames.delayGuards.unsubscribed)
  }

  /** Both checks now (tests, operator routes). */
  async runChecks(): Promise<{ stationAlerts: CheckSummary; delayGuards: GuardCheckSummary }> {
    return {
      stationAlerts: (await this.tasks.runNow("station-alerts")) as CheckSummary,
      delayGuards: (await this.tasks.runNow("delay-guards")) as GuardCheckSummary,
    }
  }

  /** How many devices are subscribed, and the tasks' schedules, for the debug routes. */
  async getStatus() {
    return {
      stationAlerts: (await this.stationAlerts.readSubscriptions()).length,
      delayGuards: (await this.delayGuards.readSubscriptions()).length,
      tasks: await this.tasks.status(),
    }
  }

  // --- the loop ----------------------------------------------------------------

  async alarm() {
    await this.tasks.onAlarm()
  }
}
