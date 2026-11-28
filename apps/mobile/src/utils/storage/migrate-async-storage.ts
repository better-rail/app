import type { MMKV } from "react-native-mmkv"

export const MIGRATION_DONE_KEY = "asyncStorageMigrated"

// Every key the app itself kept in AsyncStorage. PostHog's keys stay there.
export const MIGRATED_KEYS = [
  "root",
  "appLanguage",
  "telemetry_disabled",
  "seenLiveAnnouncement",
  "lastInAppReview",
  "appInstallDate",
  "lastAppLaunch",
  "device_last_sync",
]

type Source = { multiGet: (keys: string[]) => Promise<readonly (readonly [string, string | null])[]> }
type Target = Pick<MMKV, "getBoolean" | "getString" | "contains" | "set">

export const isAsyncStorageMigrated = (target: Pick<MMKV, "getBoolean">) => target.getBoolean(MIGRATION_DONE_KEY) === true

/** Copies the app's AsyncStorage data into MMKV once. The AsyncStorage copy is left in place. */
export async function migrateAsyncStorage(source: Source, target: Target) {
  if (isAsyncStorageMigrated(target)) return

  for (const [key, value] of await source.multiGet(MIGRATED_KEYS)) {
    // A key already in MMKV came from an interrupted run or is newer, so it wins
    if (value == null || target.contains(key)) continue
    target.set(key, value)
    if (target.getString(key) !== value) throw new Error(`MMKV did not keep "${key}"`)
  }

  target.set(MIGRATION_DONE_KEY, true)
}
