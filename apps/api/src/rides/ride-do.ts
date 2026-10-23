/**
 * ride-do.ts — a Durable Object per tracked ride.
 *
 * Replaces the Bun server's in-process `Scheduler` map + the `rides:*` hashes
 * in redis: the ride's state lives in the object's storage and its minute
 * cadence is a Durable Object alarm, so a deploy or an eviction loses nothing
 * and no boot-time "reschedule every ride" pass is needed (which is also why
 * the local-run guard around ride tracking went away — a local `wrangler dev`
 * has its own objects). The object's name is the ride id.
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, type Env } from "../runtime"
import { logNames, logger } from "../logs"
import { Ride, RideAlarmRequest, RideAlarmStop } from "../types/ride"
import { NotFoundRouteForRide, RideFailureReason, RideNotInTimeError, rideFailureReason } from "../utils/errors"
import { RideTracker, TrackerState } from "./tracker"

export type StartRideResult = { success: true; rideId: string } | { success: false; reason: RideFailureReason }

const STATE_KEY = "state"

export class RideDO extends DurableObject<Env> {
  private tracker?: RideTracker
  private loaded = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  private async load() {
    if (this.loaded) return
    const state = await this.ctx.storage.get<TrackerState>(STATE_KEY)
    if (state) this.tracker = RideTracker.restore(state, logger.child({ rideId: state.ride.rideId, token: state.ride.token }))
    this.loaded = true
  }

  private async save() {
    if (this.tracker) await this.ctx.storage.put(STATE_KEY, this.tracker.state())
  }

  private async armAlarm() {
    if (this.tracker) await this.ctx.storage.setAlarm(this.tracker.nextTickAt(Date.now()))
  }

  private async clear() {
    this.tracker = undefined
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  /** POST /ride: look the route up, remember the ride and start its schedule. */
  async start(ride: Ride): Promise<StartRideResult> {
    await this.load()
    const rideLogger = logger.child({ rideId: ride.rideId, token: ride.token })
    const registerRideLog = logNames.scheduler.scheduleRide

    try {
      const tracker = await RideTracker.create(ride, rideLogger)

      // Starting the same ride twice ends the first schedule, like before.
      if (this.tracker) await this.clear()

      this.tracker = tracker
      await this.save()
      await tracker.startup()
      await this.save()
      await this.armAlarm()

      rideLogger.info(registerRideLog.success, { ...ride })
      return { success: true, rideId: ride.rideId }
    } catch (error) {
      const reason = rideFailureReason(error)

      // Warn, not error: a ride outside the startable window isn't a server fault, and a missing
      // route's cause was already logged as an error by getRouteForRide.
      if (error instanceof RideNotInTimeError || error instanceof NotFoundRouteForRide) {
        rideLogger.warn(registerRideLog.failed, { reason, ...ride })
      } else {
        rideLogger.error(registerRideLog.failed, { error, reason, ...ride })
      }

      return { success: false, reason }
    }
  }

  /** The tick: delays, alarm moves and whatever notification is due. */
  async alarm() {
    await this.load()
    if (!this.tracker) return

    try {
      const { ended } = await this.tracker.tick(new Date())
      if (ended) {
        this.tracker.logger.info(logNames.scheduler.cancelRide.success)
        await this.clear()
        return
      }
      await this.save()
    } catch (error) {
      // Keep ticking: the next minute retries with fresh data, like the old jobs did.
      this.tracker.logger.error(logNames.scheduler.updateDelay.updated, { error })
    }
    await this.armAlarm()
  }

  async updateToken(token: string): Promise<boolean> {
    await this.load()
    try {
      if (!this.tracker) throw new Error("Scheduler not found")

      this.tracker.updateRideToken(token)
      await this.save()
      this.tracker.logger.info(logNames.scheduler.updateRideToken.success)
      return true
    } catch (error) {
      logger.error(logNames.scheduler.updateRideToken.failed, { error, rideId: this.tracker?.ride.rideId, token })
      return false
    }
  }

  /** Returns when each stop's alarm should ring, or undefined when the ride isn't tracked */
  async setAlarm(request: RideAlarmRequest): Promise<RideAlarmStop[] | undefined> {
    await this.load()
    try {
      if (!this.tracker) throw new Error("Scheduler not found")

      const stops = this.tracker.setAlarm(request)
      if (!stops) throw new Error("Couldn't save the alarm")
      await this.save()

      this.tracker.logger.info(logNames.scheduler.setAlarm.success, { stops, leadMinutes: request.leadMinutes })
      return stops
    } catch (error) {
      logger.error(logNames.scheduler.setAlarm.failed, { error, rideId: this.tracker?.ride.rideId })
      return undefined
    }
  }

  async removeAlarm(): Promise<boolean> {
    await this.load()
    // The ride already ended, and its alarm with it.
    if (!this.tracker) return true

    this.tracker.removeAlarm()
    await this.save()
    this.tracker.logger.info(logNames.scheduler.removeAlarm.success)
    return true
  }

  /** DELETE /ride: stop the schedule and forget the ride. */
  async end(): Promise<boolean> {
    await this.load()
    const rideLogger = this.tracker?.logger
    await this.clear()
    rideLogger?.info(logNames.scheduler.cancelRide.success)
    return true
  }
}
