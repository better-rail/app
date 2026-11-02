import { describe, expect, it } from "bun:test"
import { isRetryableDurableObjectError, retryDurableObjectCall } from "../../src/utils/durable-object-retry"

const platformError = (props: { retryable?: boolean; overloaded?: boolean }) =>
  Object.assign(new Error("internal error; reference = qefbjg0o4s60rf5btatd80hf"), props)

// Fails with each queued error in turn, then succeeds.
const flakyCall = (errors: Error[]) => {
  let calls = 0
  const call = async () => {
    calls++
    const error = errors.shift()
    if (error) throw error
    return "ok"
  }
  return { call, calls: () => calls }
}

describe("isRetryableDurableObjectError", () => {
  it("retries errors the platform marks retryable", () => {
    expect(isRetryableDurableObjectError(platformError({ retryable: true }))).toBe(true)
  })

  it("doesn't retry an overloaded object or an ordinary error", () => {
    expect(isRetryableDurableObjectError(platformError({ retryable: true, overloaded: true }))).toBe(false)
    expect(isRetryableDurableObjectError(new Error("Scheduler not found"))).toBe(false)
    expect(isRetryableDurableObjectError(undefined)).toBe(false)
  })
})

describe("retryDurableObjectCall", () => {
  it("succeeds after a transient failure", async () => {
    const flaky = flakyCall([platformError({ retryable: true })])
    expect(await retryDurableObjectCall(flaky.call, 0)).toBe("ok")
    expect(flaky.calls()).toBe(2)
  })

  it("gives up after three attempts", async () => {
    const errors = [1, 2, 3].map(() => platformError({ retryable: true }))
    const flaky = flakyCall([...errors])
    await expect(retryDurableObjectCall(flaky.call, 0)).rejects.toBe(errors[2])
    expect(flaky.calls()).toBe(3)
  })

  it("throws a non-retryable error right away", async () => {
    const error = platformError({ retryable: true, overloaded: true })
    const flaky = flakyCall([error])
    await expect(retryDurableObjectCall(flaky.call, 0)).rejects.toBe(error)
    expect(flaky.calls()).toBe(1)
  })
})
