import { mock } from "bun:test"

mock.module("expo-localization", () => {
  return {
    t: (key) => `${key}.test`,
  }
})
