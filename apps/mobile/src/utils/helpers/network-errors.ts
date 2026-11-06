import axios from "axios"
import { AppState } from "react-native"

// ERR_NETWORK: no response, e.g. the device is offline or iOS just resumed the app.
// ECONNABORTED / ETIMEDOUT: the request timed out, usually on a slow mobile connection.
const NETWORK_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"])

// Longest axios timeout across the API clients: a request that failed within this window of
// the app leaving or returning to the foreground may have been in flight while it was suspended.
// Resumes count too, since the OS delivers the failure only once the app is active again.
const MAX_REQUEST_MS = 30_000

let lastStateChangeAt = 0
AppState.addEventListener("change", () => {
  lastStateChangeAt = Date.now()
})

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && NETWORK_ERROR_CODES.has(error.code ?? "")
}

// The OS drops sockets when the app is backgrounded, so a network error around a suspension
// says nothing about connectivity or the API. Used to skip reporting those to Sentry.
export function isSuspendedNetworkError(error: unknown): boolean {
  if (!isNetworkError(error)) return false
  return AppState.currentState !== "active" || Date.now() - lastStateChangeAt < MAX_REQUEST_MS
}

// react-query `retry`: send the request once more when it got no response, since a dropped
// connection usually goes through on the next attempt. Timeouts already waited the full 30s, so they fail.
export function retryOnceOnNetworkError(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && axios.isAxiosError(error) && error.code === "ERR_NETWORK"
}
