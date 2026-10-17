import { test, expect } from "bun:test"
import { AxiosError, AxiosHeaders } from "axios"
import { isNetworkError } from "./network-errors"

test("connectivity failures and timeouts count as network errors", () => {
  expect(isNetworkError(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(true)
  expect(isNetworkError(new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"))).toBe(true)
  expect(isNetworkError(new AxiosError("timeout of 30000ms exceeded", "ETIMEDOUT"))).toBe(true)
})

test("server responses and non-axios errors are not network errors", () => {
  const config = { headers: new AxiosHeaders() }
  const response = { status: 500, statusText: "Internal Server Error", data: {}, headers: {}, config }
  const serverError = new AxiosError("Request failed with status code 500", "ERR_BAD_RESPONSE", config, null, response)
  expect(isNetworkError(serverError)).toBe(false)
  expect(isNetworkError(new Error("Network Error"))).toBe(false)
})
