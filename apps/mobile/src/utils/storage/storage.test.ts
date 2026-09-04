import { test, expect, beforeEach, afterEach, mock } from "bun:test"
import { load, loadString, save, saveString, clear, remove } from "./storage"

// Mock AsyncStorage directly
const mockAsyncStorage = {
  getItem: mock(() => Promise.resolve(null)),
  setItem: mock(() => Promise.resolve()),
  removeItem: mock(() => Promise.resolve()),
  clear: mock(() => Promise.resolve()),
}

// Mock the async-storage module
mock.module("@react-native-async-storage/async-storage", () => ({
  default: mockAsyncStorage,
  ...mockAsyncStorage,
}))

// fixtures
const VALUE_OBJECT = { x: 1 }
const VALUE_STRING = JSON.stringify(VALUE_OBJECT)

beforeEach(() => {
  mockAsyncStorage.getItem.mockReturnValue(Promise.resolve(VALUE_STRING))
})

afterEach(() => {
  mock.restore()
})

test("load", async () => {
  const value = await load("something")
  expect(value).toEqual(JSON.parse(VALUE_STRING))
})

test("loadString", async () => {
  const value = await loadString("something")
  expect(value).toEqual(VALUE_STRING)
})

test("save", async () => {
  await save("something", VALUE_OBJECT)
  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
})

test("saveString", async () => {
  await saveString("something", VALUE_STRING)
  expect(mockAsyncStorage.setItem).toHaveBeenCalledWith("something", VALUE_STRING)
})

test("remove", async () => {
  await remove("something")
  expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith("something")
})

test("clear", async () => {
  await clear()
  expect(mockAsyncStorage.clear).toHaveBeenCalledWith()
})
