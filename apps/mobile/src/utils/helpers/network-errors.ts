import axios from "axios"

// ERR_NETWORK: no response, e.g. the device is offline or iOS just resumed the app.
// ECONNABORTED / ETIMEDOUT: the request timed out, usually on a slow mobile connection.
const NETWORK_ERROR_CODES = new Set(["ERR_NETWORK", "ECONNABORTED", "ETIMEDOUT"])

export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && NETWORK_ERROR_CODES.has(error.code ?? "")
}
