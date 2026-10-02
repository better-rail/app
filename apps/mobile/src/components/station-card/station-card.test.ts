import { describe, expect, it } from "bun:test"
import { getStationCardHeight } from "./station-card-height"

describe("getStationCardHeight", () => {
  it("preserves previous fixed card height on a 393px-wide phone with screen height at least 680px instead of 149px", () => {
    // iPhone 14 / 15 / 16 (393 x 852)
    expect(getStationCardHeight(852, 393)).toBe(178.5)
    expect(getStationCardHeight(852, 393)).not.toBe(149)

    // 393-wide phone with 750px height
    expect(getStationCardHeight(750, 393)).toBe(157.5)
    expect(getStationCardHeight(750, 393)).not.toBe(149)

    // 393-wide phone with 700px height
    expect(getStationCardHeight(700, 393)).toBe(135)
    expect(getStationCardHeight(700, 393)).not.toBe(149)
  })

  it("applies the previous screen-height threshold behavior for portrait phones", () => {
    expect(getStationCardHeight(932, 430)).toBe(190) // Large phones (> 900)
    expect(getStationCardHeight(800, 360)).toBe(178.5) // Standard phones (> 780)
    expect(getStationCardHeight(750, 375)).toBe(157.5) // Mid-height phones (> 730)
    expect(getStationCardHeight(650, 375)).toBe(135) // Shorter phones (> 600)
    expect(getStationCardHeight(580, 360)).toBe(120) // Compact devices (<= 600)
  })

  it("handles wide / unfolded foldable screens responsively", () => {
    // Unfolded foldable (e.g. 841 x 700)
    expect(getStationCardHeight(700, 841)).toBe(175)

    // Short height unfolded screen (< 680)
    expect(getStationCardHeight(600, 800)).toBe(128)
  })
})
