import { test, expect } from "bun:test"
import { AxiosError, AxiosHeaders } from "axios"
import { isNetworkError, isUpstreamTimeout } from "./network-errors"

const responseError = (status: number) => {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, {}, {
    status,
    statusText: "",
    headers: {},
    config,
    data: {},
  })
}

test("a 504 from our API is an upstream timeout, not a network error", () => {
  const error = responseError(504)

  expect(isUpstreamTimeout(error)).toBe(true)
  expect(isNetworkError(error)).toBe(false)
})

test("other server errors are not upstream timeouts", () => {
  expect(isUpstreamTimeout(responseError(500))).toBe(false)
  expect(isUpstreamTimeout(new Error("Request failed with status code 504"))).toBe(false)
})

test("a request with no response is not an upstream timeout", () => {
  expect(isUpstreamTimeout(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(false)
})
