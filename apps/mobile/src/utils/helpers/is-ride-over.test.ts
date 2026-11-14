import { describe, expect, test } from "bun:test"
import { isRideOver } from "./ride-helpers"

describe("isRideOver", () => {
  const arrivalTime = new Date(2026, 10, 12, 9, 0).getTime()
  const route = (delay: number) => ({ arrivalTime, trains: [{ delay: 0 }, { delay }] }) as never

  test("a ride from yesterday is over", () => {
    expect(isRideOver(route(0), arrivalTime + 24 * 60 * 60 * 1000)).toBe(true)
  })

  test("a ride that just arrived isn't over yet, in case it ran later than it last said", () => {
    expect(isRideOver(route(0), arrivalTime + 30 * 60 * 1000)).toBe(false)
  })

  test("the last train's delay pushes the arrival back", () => {
    const anHourAndAHalfLater = arrivalTime + 90 * 60 * 1000
    expect(isRideOver(route(0), anHourAndAHalfLater)).toBe(true)
    expect(isRideOver(route(45), anHourAndAHalfLater)).toBe(false)
  })
})
