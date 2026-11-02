/**
 * durable-object-retry.ts — retry a Durable Object call through Cloudflare's transient failures.
 *
 * A call into a Durable Object can fail on the platform's side ("internal error; reference = …",
 * a reset object, a network blip between the Worker and the object). Cloudflare marks those
 * errors `retryable`, and `overloaded` when the object is already swamped, where retrying only
 * makes it worse. Their guidance is to retry the retryable ones with a fresh stub, since a stub
 * that threw may stay broken — so `call` should build its stub each time it runs.
 */
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 50

type DurableObjectError = { retryable?: boolean; overloaded?: boolean }

export const isRetryableDurableObjectError = (error: unknown) => {
  if (typeof error !== "object" || error === null) return false
  const { retryable, overloaded } = error as DurableObjectError
  return retryable === true && overloaded !== true
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const retryDurableObjectCall = async <T>(call: () => T, delayMs = BASE_DELAY_MS): Promise<Awaited<T>> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call()
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryableDurableObjectError(error)) throw error
      // Exponential backoff with jitter, kept short: the app is waiting on the response.
      await sleep(delayMs * 2 ** (attempt - 1) * (1 + Math.random()))
    }
  }
}
