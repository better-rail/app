import { test, expect } from "bun:test"
import { migrateAsyncStorage, isAsyncStorageMigrated, MIGRATION_DONE_KEY } from "./migrate-async-storage"

const ROOT = JSON.stringify({ favoriteRoutes: { routes: [{ id: "3700-680" }] } })

const asyncStorage = (data: Record<string, string>) => ({
  multiGet: async (keys: string[]) => keys.map((key) => [key, data[key] ?? null] as const),
})

function fakeMMKV(initial: Record<string, string | boolean> = {}) {
  const data = new Map(Object.entries(initial))
  let failOn: string | undefined
  return {
    data,
    failOnceOn: (key: string) => (failOn = key),
    getBoolean: (key: string) => data.get(key) as boolean | undefined,
    getString: (key: string) => data.get(key) as string | undefined,
    contains: (key: string) => data.has(key),
    set: (key: string, value: string | boolean) => {
      if (key === failOn) {
        failOn = undefined
        throw new Error("disk full")
      }
      data.set(key, value)
    },
  }
}

test("copies the saved data and marks the migration done", async () => {
  const mmkv = fakeMMKV()
  await migrateAsyncStorage(asyncStorage({ root: ROOT, appLanguage: '"he"', telemetry_disabled: "true" }), mmkv)

  expect(Object.fromEntries(mmkv.data)).toEqual({
    root: ROOT,
    appLanguage: '"he"',
    telemetry_disabled: "true",
    [MIGRATION_DONE_KEY]: true,
  })
})

test("never overwrites a value MMKV already has", async () => {
  const newerRoot = JSON.stringify({ favoriteRoutes: { routes: [] } })
  const mmkv = fakeMMKV({ root: newerRoot })
  await migrateAsyncStorage(asyncStorage({ root: ROOT, appLanguage: '"he"' }), mmkv)

  expect(mmkv.data.get("root")).toBe(newerRoot)
  expect(mmkv.data.get("appLanguage")).toBe('"he"')
})

test("an interrupted run stays unmarked and finishes on the next launch", async () => {
  const source = asyncStorage({ root: ROOT, appLanguage: '"he"' })
  const mmkv = fakeMMKV()
  mmkv.failOnceOn("appLanguage")

  await expect(migrateAsyncStorage(source, mmkv)).rejects.toThrow("disk full")
  expect(isAsyncStorageMigrated(mmkv)).toBe(false)

  await migrateAsyncStorage(source, mmkv)
  expect(isAsyncStorageMigrated(mmkv)).toBe(true)
  expect(mmkv.data.get("root")).toBe(ROOT)
  expect(mmkv.data.get("appLanguage")).toBe('"he"')
})

test("stays unmarked when AsyncStorage cannot be read", async () => {
  const mmkv = fakeMMKV()
  const broken = { multiGet: () => Promise.reject(new Error("read failed")) }

  await expect(migrateAsyncStorage(broken, mmkv)).rejects.toThrow("read failed")
  expect(mmkv.data.size).toBe(0)
})

test("does nothing once migrated, even if AsyncStorage still holds the old copy", async () => {
  const mmkv = fakeMMKV({ [MIGRATION_DONE_KEY]: true })
  await migrateAsyncStorage(asyncStorage({ root: ROOT }), mmkv)

  expect(mmkv.data.has("root")).toBe(false)
})
