import { test, expect } from "bun:test"
import { rideStartErrorLevel, toLiveActivityError } from "./ride-errors"

// The shape React Native gives a promise rejected from Swift with `reject(code, message, NSError)`.
const nativeError = (code: string, userInfo: Record<string, unknown> = {}) =>
  Object.assign(new Error("native"), { code, domain: "live-activity", userInfo })

test("an iOS start request that got no response is an API failure reported as a warning", () => {
  const error = toLiveActivityError(nativeError("no_response", { urlErrorCode: -1001 }))

  expect(error.stage).toBe("api")
  expect(rideStartErrorLevel(error)).toBe("warning")
})
