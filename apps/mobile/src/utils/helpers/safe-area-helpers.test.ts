import { describe, expect, it } from "bun:test"
import { logicalSideInsets, sideInsetPadding } from "./safe-area-helpers"

// An illustrative right-edge inset, like the side bar column on iPhone Duo's outer display.
const duoInsets = { left: 0, right: 62 }

describe("logicalSideInsets", () => {
  it("keeps the physical sides in left-to-right layouts", () => {
    expect(logicalSideInsets(duoInsets, false)).toEqual({ start: 0, end: 62 })
  })

  it("maps the right inset onto the start side in right-to-left layouts", () => {
    expect(logicalSideInsets(duoInsets, true)).toEqual({ start: 62, end: 0 })
  })
})

describe("sideInsetPadding", () => {
  it("adds the extra spacing to both sides", () => {
    expect(sideInsetPadding(duoInsets, false, 12)).toEqual({ paddingStart: 12, paddingEnd: 74 })
    expect(sideInsetPadding(duoInsets, true, 12)).toEqual({ paddingStart: 74, paddingEnd: 12 })
  })
})
