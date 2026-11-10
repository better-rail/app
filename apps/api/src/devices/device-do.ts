/**
 * device-do.ts — a Durable Object per device, named by its anonymous device id.
 *
 * Holds what the device synced (its push tokens and recurring rides) so the server can act on the device's
 * behalf later, e.g. start a recurring ride before departure from the object's own alarm. The logic lives in
 * store.ts; this class only binds it to the object's storage. Nothing here logs the device id, the secret or a
 * push token (Workers Logs keep everything `console` prints).
 */
import { DurableObject } from "cloudflare:workers"

import { bindRuntime, type Env } from "../runtime"
import type { DeviceState } from "../types/device"
import { deleteDeviceState, syncDeviceState, type SyncDeviceResult } from "./store"

export class DeviceDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    bindRuntime(env)
  }

  /** PUT /device: replace the device's state; the first sync registers the device. */
  async sync(secretHash: string, state: DeviceState): Promise<SyncDeviceResult> {
    return syncDeviceState(this.ctx.storage, secretHash, state)
  }

  /** DELETE /device: wipe the object. False when the device is unknown or the secret is wrong. */
  async remove(secretHash: string): Promise<boolean> {
    const removed = await deleteDeviceState(this.ctx.storage, secretHash)
    if (removed) await this.ctx.storage.deleteAlarm()
    return removed
  }
}
