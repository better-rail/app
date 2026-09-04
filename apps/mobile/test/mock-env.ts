import { mock } from "bun:test"

mock.module("@env", () => ({
  POSTHOG_API_KEY: "test-posthog-key",
}))
