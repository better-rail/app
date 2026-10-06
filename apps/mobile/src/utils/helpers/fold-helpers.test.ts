import { describe, expect, it } from "bun:test"
import { splitAroundFold } from "./fold-helpers"

// An illustrative 900pt-wide row with a 40pt fold in its middle.
const fold = { x: 430, y: 0, width: 40, height: 600 }

describe("splitAroundFold", () => {
  it("ends the first column at the fold in left-to-right layouts", () => {
    expect(splitAroundFold(900, [fold], false, 20)).toEqual({ firstColumnWidth: 410, gap: 40 })
  })

  it("measures the first column from the right in right-to-left layouts", () => {
    expect(splitAroundFold(900, [fold], true, 20)).toEqual({ firstColumnWidth: 410, gap: 40 })
    expect(splitAroundFold(900, [{ ...fold, x: 400 }], true, 0)).toEqual({ firstColumnWidth: 460, gap: 40 })
  })

  it("ignores horizontal folds and missing divisions", () => {
    expect(splitAroundFold(900, [], false, 0)).toBeNull()
    expect(splitAroundFold(900, [{ x: 0, y: 300, width: 900, height: 40 }], false, 0)).toBeNull()
  })

  it("ignores a fold that would leave a column too narrow", () => {
    expect(splitAroundFold(900, [{ ...fold, x: 100 }], false, 0)).toBeNull()
  })
})
