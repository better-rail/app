import { describe, expect, it } from "bun:test"
import { AxiosError } from "axios"
import { RoutesNotFoundError } from "@/models/train-routes/search-routes"
import { isExpectedQueryOutcome } from "./query-errors"

describe("isExpectedQueryOutcome", () => {
  it("treats an empty route search as expected", () => {
    expect(isExpectedQueryOutcome(new RoutesNotFoundError())).toBe(true)
  })

  it("treats the legacy plain Not found error as expected", () => {
    expect(isExpectedQueryOutcome(new Error("Not found"))).toBe(true)
  })

  it("matches by name when the prototype chain is lost", () => {
    expect(isExpectedQueryOutcome({ name: "RoutesNotFoundError", message: "Not found" })).toBe(true)
  })

  it("keeps network and other failures reportable", () => {
    expect(isExpectedQueryOutcome(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(false)
    expect(isExpectedQueryOutcome(new Error("Error fetching results"))).toBe(false)
    expect(isExpectedQueryOutcome(new Error("Missing origin / destination data"))).toBe(false)
    expect(isExpectedQueryOutcome(undefined)).toBe(false)
    expect(isExpectedQueryOutcome("Not found")).toBe(false)
  })
})
