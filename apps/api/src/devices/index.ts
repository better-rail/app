/**
 * devices/index.ts — the device routes' view of the per-device Durable Objects.
 *
 * Callers pass the secret's hash, never the secret. Failures are logged without the device id: the log line
 * only needs to say that a device call failed, not whose.
 */
import { runtime } from "../runtime"
import { logNames, logger } from "../logs"
import type { DeviceState } from "../types/device"
import { retryDurableObjectCall } from "../utils/durable-object-retry"
import type { SyncDeviceResult } from "./store"

// Both calls are safe to repeat (a sync replaces the whole state, a delete of a deleted device is a no-op), so a
// transient platform failure is retried, each attempt on a fresh stub.
const deviceObject = (deviceId: string) => runtime().DEVICES.getByName(deviceId)

export type SyncDeviceOutcome = SyncDeviceResult | { ok: false; error: true }

export const syncDevice = async (deviceId: string, secretHash: string, state: DeviceState): Promise<SyncDeviceOutcome> => {
  try {
    return await retryDurableObjectCall(() => deviceObject(deviceId).sync(secretHash, state))
  } catch (error) {
    logger.error(logNames.devices.sync.failed, { error })
    return { ok: false, error: true }
  }
}

/** `true` deleted, `false` unknown device or wrong secret, `undefined` the call failed. */
export const deleteDevice = async (deviceId: string, secretHash: string): Promise<boolean | undefined> => {
  try {
    return await retryDurableObjectCall(() => deviceObject(deviceId).remove(secretHash))
  } catch (error) {
    logger.error(logNames.devices.delete.failed, { error })
    return undefined
  }
}
