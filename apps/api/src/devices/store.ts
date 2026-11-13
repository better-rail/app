/**
 * store.ts — a device's state over Durable Object storage, kept apart from the object so `bun test` can run it
 * on an in-memory storage.
 *
 * Registration is trust on first use: the first sync for a device id stores the hash of the secret it came with,
 * and every later call must present the same secret. A wrong secret and an unknown device get the same answer, so
 * a caller can't probe which device ids exist.
 */
import { safeEqual } from "../routes/helpers"
import type { DeviceRecord, DeviceState } from "../types/device"

/** The slice of `DurableObjectStorage` the device state needs. */
export interface DeviceStorage {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  deleteAll(): Promise<void>
}

export type SyncDeviceResult = { ok: true; created: boolean } | { ok: false }

const RECORD_KEY = "device"

/** sha256 of the device secret, hex encoded. Only the hash ever reaches the Durable Object. */
export const hashSecret = async (secret: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const authorized = (record: DeviceRecord | undefined, secretHash: string): record is DeviceRecord =>
  record !== undefined && safeEqual(record.secretHash, secretHash)

/** Replace the device's state with `state`, registering the device on its first sync. */
export const syncDeviceState = async (
  storage: DeviceStorage,
  secretHash: string,
  state: DeviceState,
  now = Date.now(),
): Promise<SyncDeviceResult> => {
  const record = await storage.get<DeviceRecord>(RECORD_KEY)
  if (record && !authorized(record, secretHash)) return { ok: false }

  await storage.put<DeviceRecord>(RECORD_KEY, {
    ...state,
    secretHash,
    createdAt: record?.createdAt ?? now,
    lastSyncAt: now,
  })
  return { ok: true, created: !record }
}

/** Wipe everything the device stored. False when the device is unknown or the secret is wrong. */
export const deleteDeviceState = async (storage: DeviceStorage, secretHash: string): Promise<boolean> => {
  const record = await storage.get<DeviceRecord>(RECORD_KEY)
  if (!authorized(record, secretHash)) return false
  await storage.deleteAll()
  return true
}

/** The stored record, for the object's own use (scheduling, reminders); never sent back to a client. */
export const readDeviceRecord = (storage: DeviceStorage) => storage.get<DeviceRecord>(RECORD_KEY)

export const writeDeviceRecord = (storage: DeviceStorage, record: DeviceRecord) => storage.put(RECORD_KEY, record)
