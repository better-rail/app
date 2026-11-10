/**
 * identity.ts — the device's anonymous identity for the server's per-device state.
 *
 * No account: the app makes up a random device id and a secret the first time it needs them and keeps both in
 * the iOS Keychain / Android Keystore (expo-secure-store). The server keeps only the secret's hash, and the first
 * sync under an id claims it. Neither value may be sent to analytics or crash reports, logged, or put in a URL.
 */
import * as Crypto from "expo-crypto"
import * as SecureStore from "expo-secure-store"

export type DeviceIdentity = { deviceId: string; secret: string }

const IDENTITY_KEY = "device_identity"

// Readable after the first unlock, so a background task can sync; never migrated to another device by a backup,
// where a second phone would otherwise share this one's identity.
const storeOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SECRET = /^[0-9a-f]{64}$/

const isIdentity = (value: unknown): value is DeviceIdentity => {
  const identity = value as Partial<DeviceIdentity> | null
  return (
    typeof identity?.deviceId === "string" &&
    UUID.test(identity.deviceId) &&
    typeof identity.secret === "string" &&
    SECRET.test(identity.secret)
  )
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const createIdentity = (): DeviceIdentity => ({
  deviceId: Crypto.randomUUID().toLowerCase(),
  secret: toHex(Crypto.getRandomBytes(32)),
})

const readIdentity = async (): Promise<DeviceIdentity | undefined> => {
  const stored = await SecureStore.getItemAsync(IDENTITY_KEY, storeOptions)
  if (!stored) return undefined
  try {
    const parsed: unknown = JSON.parse(stored)
    return isIdentity(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

const loadOrCreateIdentity = async (): Promise<DeviceIdentity> => {
  const stored = await readIdentity()
  if (stored) return stored

  const identity = createIdentity()
  await SecureStore.setItemAsync(IDENTITY_KEY, JSON.stringify(identity), storeOptions)
  return identity
}

// Concurrent first calls share one creation, so they can't each store a different identity.
let pending: Promise<DeviceIdentity> | undefined

/** The device's identity, created and stored on first use. */
export const getDeviceIdentity = (): Promise<DeviceIdentity> => {
  pending ??= loadOrCreateIdentity().catch((error: unknown) => {
    pending = undefined
    throw error
  })
  return pending
}

/** The stored identity, without creating one. */
export const peekDeviceIdentity = async (): Promise<DeviceIdentity | undefined> => (pending ? pending : readIdentity())

/** Forget the identity (after "delete my data"); the next `getDeviceIdentity` makes a new one. */
export const clearDeviceIdentity = async () => {
  pending = undefined
  await SecureStore.deleteItemAsync(IDENTITY_KEY, storeOptions)
}
