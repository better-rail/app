import { mock } from "bun:test"

// react-native-mmkv needs the native Nitro module; back it with a Map in tests
mock.module("react-native-mmkv", () => ({
  createMMKV: () => {
    const data = new Map<string, string | number | boolean>()
    return {
      set: (key: string, value: string | number | boolean) => data.set(key, value),
      getString: (key: string) => data.get(key),
      getBoolean: (key: string) => data.get(key),
      contains: (key: string) => data.has(key),
      remove: (key: string) => data.delete(key),
    }
  },
}))
