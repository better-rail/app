import { mock } from "bun:test"

// Create a custom AsyncStorage mock for Bun
const mockAsyncStorage = {
  getItem: mock(() => Promise.resolve(null)),
  setItem: mock(() => Promise.resolve()),
  removeItem: mock(() => Promise.resolve()),
  multiSet: mock(() => Promise.resolve()),
  multiRemove: mock(() => Promise.resolve()),
  clear: mock(() => Promise.resolve()),
  getAllKeys: mock(() => Promise.resolve([])),
  multiGet: mock(() => Promise.resolve([])),
}

mock.module("@react-native-async-storage/async-storage", () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}))
