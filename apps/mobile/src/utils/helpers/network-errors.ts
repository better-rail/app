import axios from "axios"

// The request never got a response, e.g. the device is offline or iOS just resumed the app.
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.code === "ERR_NETWORK"
}

export function retryOnNetworkError(failureCount: number, error: unknown): boolean {
  return isNetworkError(error) && failureCount < 2
}
