import axios from "axios"

// ERR_NETWORK: no response, e.g. the device is offline or iOS just resumed the app.
// ECONNABORTED / ETIMEDOUT: the request timed out, usually on a slow mobile connection.
const NETWORK_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"])

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && NETWORK_ERROR_CODES.has(error.code ?? "")
}

// react-query `retry`: send the request once more when it got no response, since a dropped
// connection usually goes through on the next attempt. Timeouts already waited the full 30s, so they fail.
export function retryOnceOnNetworkError(failureCount: number, error: unknown): boolean {
  return failureCount < 1 && axios.isAxiosError(error) && error.code === "ERR_NETWORK"
}
