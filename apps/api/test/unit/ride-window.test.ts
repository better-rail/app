import { describe, expect, it } from "bun:test"

import { isRideTooFarAhead } from "../../src/rides/tracker"

const now = Date.UTC(2026, 10, 25, 16, 4)
const inMinutes = (minutes: number) => ({ departureTime: now + minutes * 60_000 })

describe("isRideTooFarAhead", () => {
  it("takes a train an hour away, with slack for a recurring ride started an hour ahead", () => {
    expect(isRideTooFarAhead(inMinutes(60), now)).toBe(false)
    expect(isRideTooFarAhead(inMinutes(65), now)).toBe(false)
    expect(isRideTooFarAhead(inMinutes(75), now)).toBe(false)
  })

  it("refuses a train further away", () => {
    expect(isRideTooFarAhead(inMinutes(77), now)).toBe(true)
    expect(isRideTooFarAhead(inMinutes(180), now)).toBe(true)
  })
})
