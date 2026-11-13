import { createMMKV } from "react-native-mmkv"
import { AsyncStorage } from "./async-storage"
import { isAsyncStorageMigrated, migrateAsyncStorage } from "./migrate-async-storage"

const mmkv = createMMKV()

// After a failed migration the saved data is only in AsyncStorage; a write here would shadow it for good.
let readOnly = false

export const isReadOnly = () => readOnly

/** False until the AsyncStorage data has been copied over: nothing may be read or written before that. */
export const isMigrated = () => isAsyncStorageMigrated(mmkv)

/** Runs the one-time copy from AsyncStorage. Never rejects: on failure storage stays read-only until the next launch retries. */
export async function migrate(): Promise<Error | undefined> {
  try {
    await migrateAsyncStorage(AsyncStorage, mmkv)
    return undefined
  } catch (error) {
    readOnly = true
    return error instanceof Error ? error : new Error(String(error))
  }
}

/** Erases data the user asked to delete: from MMKV even when read-only, and the copy the migration left in AsyncStorage. */
export async function erase(key: string): Promise<void> {
  try {
    mmkv.remove(key)
  } catch {}
  await AsyncStorage.removeItem(key).catch(() => {})
}

/** Loads a value from storage and runs it through JSON.parse. */
export function load(key: string): any | null {
  try {
    const value = mmkv.getString(key)
    return value === undefined ? null : JSON.parse(value)
  } catch {
    return null
  }
}

/** Saves a JSON-serializable value. Returns whether it was written. */
export function save(key: string, value: any): boolean {
  if (readOnly) return false
  try {
    mmkv.set(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(key: string): void {
  if (readOnly) return
  try {
    mmkv.remove(key)
  } catch {}
}
