import { mock } from "bun:test"
import { randomBytes, randomUUID } from "node:crypto"

/** The in-memory keychain behind the expo-secure-store mock, for tests to inspect and seed. */
export const mockSecureStore = {
  items: new Map<string, string>(),
  writes: [] as { key: string; options: unknown }[],
  failNextWrite: false,
  reset() {
    this.items.clear()
    this.writes.length = 0
    this.failNextWrite = false
  },
}

mock.module("expo-secure-store", () => ({
  AFTER_FIRST_UNLOCK: 0,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  getItemAsync: async (key: string) => mockSecureStore.items.get(key) ?? null,
  setItemAsync: async (key: string, value: string, options: unknown) => {
    if (mockSecureStore.failNextWrite) {
      mockSecureStore.failNextWrite = false
      throw new Error("keychain unavailable")
    }
    mockSecureStore.writes.push({ key, options })
    mockSecureStore.items.set(key, value)
  },
  deleteItemAsync: async (key: string) => void mockSecureStore.items.delete(key),
}))

mock.module("expo-crypto", () => ({
  randomUUID: () => randomUUID(),
  getRandomBytes: (count: number) => new Uint8Array(randomBytes(count)),
}))
