/**
 * device-do.ts — a Durable Object per device, named by its anonymous device id.
 *
 * Holds what the device synced (its push tokens and recurring rides) and keeps one alarm for the next recurring
 * ride reminder, moved after every sync and every reminder. The state logic lives in store.ts and the timing in
 * schedule.ts; this class binds them to the object's storage. Nothing here logs the device id, the secret or a
 * push token (Workers Logs keep everything `console` prints).
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, type Env } from "../runtime"
import type { DeviceRecord, DeviceState } from "../types/device"
import { autoStartRide } from "./auto-start"
import { pushTokenKey, sendReminder, withoutToken } from "./reminders"
import { nextReminder, type NextReminder } from "./schedule"
import { deleteDeviceState, readDeviceRecord, syncDeviceState, writeDeviceRecord, type SyncDeviceResult } from "./store"

const NEXT_REMINDER_KEY = "nextReminder"

// A reminder that fires this late (the platform was down, say) is no longer useful.
const STALE_REMINDER_MS = 10 * 60 * 1000

export class DeviceDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  /** Point the alarm at the next reminder after now, or clear it when no ride is due again. */
  private async schedule(record: DeviceRecord | undefined) {
    const next = record && nextReminder(record.recurringRides, Date.now())
    if (!next) {
      await this.ctx.storage.delete(NEXT_REMINDER_KEY)
      await this.ctx.storage.deleteAlarm()
      return
    }
    await this.ctx.storage.put<NextReminder>(NEXT_REMINDER_KEY, next)
    await this.ctx.storage.setAlarm(next.at)
  }

  /** PUT /device: replace the device's state; the first sync registers the device. */
  async sync(secretHash: string, state: DeviceState): Promise<SyncDeviceResult> {
    const result = await syncDeviceState(this.ctx.storage, secretHash, state)
    if (result.ok) await this.schedule(await readDeviceRecord(this.ctx.storage))
    return result
  }

  /** DELETE /device: wipe the object. False when the device is unknown or the secret is wrong. */
  async remove(secretHash: string): Promise<boolean> {
    const removed = await deleteDeviceState(this.ctx.storage, secretHash)
    if (removed) await this.ctx.storage.deleteAlarm()
    return removed
  }

  /** A reminder is due: send it for every ride due now, then move the alarm to the next one. */
  async alarm() {
    const record = await readDeviceRecord(this.ctx.storage)
    const due = await this.ctx.storage.get<NextReminder>(NEXT_REMINDER_KEY)
    const now = Date.now()

    if (record && due && now - due.at < STALE_REMINDER_MS) {
      for (const ride of record.recurringRides.filter((ride) => due.rideIds.includes(ride.id) && ride.enabled)) {
        const departureAt = due.at + ride.leadMinutes * 60_000

        if (ride.mode === "auto") {
          const started = await autoStartRide(record, ride, departureAt, now)
          if (started === "token-gone") {
            // The push-to-start token (iOS) or the FCM token (Android) will never work again.
            record.tokens = withoutToken(record.tokens, record.platform === "ios" ? "pushToStart" : "fcm")
            await writeDeviceRecord(this.ctx.storage, record)
          }
          // Remind the rider instead when this device can't be started remotely: iOS before 17.2, a route too big
          // for one push, or a push-to-start token gone (the app's own APNs token still works).
          const remindInstead = started === "unsupported" || (started === "token-gone" && record.platform === "ios")
          if (!remindInstead) continue
        }

        const reminded = await sendReminder(record, ride, departureAt, now)
        // The token will never work again: forget it until the app syncs a new one.
        if (reminded === "token-gone") {
          record.tokens = withoutToken(record.tokens, pushTokenKey(record.platform))
          await writeDeviceRecord(this.ctx.storage, record)
        }
      }
    }
    await this.schedule(record)
  }
}
