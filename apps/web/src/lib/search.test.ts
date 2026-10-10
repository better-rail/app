import { describe, expect, test } from "bun:test"
import { parseSearchWith, stringifySearchWith } from "@tanstack/react-router"
import { parseSearchValue, searchString } from "./search"

const stringify = stringifySearchWith(JSON.stringify, parseSearchValue)
const parseSearch = parseSearchWith(parseSearchValue)
const parse = (search: string) => parseSearch(search) as Record<string, unknown>

describe("search params", () => {
  test("all-digit ids stay bare in the URL and read back as strings", () => {
    expect(stringify({ date: "2026-09-06", trip: "785" })).toBe("?date=2026-09-06&trip=785")
    expect(searchString(parse("?trip=785").trip)).toBe("785")
    expect(searchString(parse("?trip=785-1234").trip)).toBe("785-1234")
    expect(searchString(parse("?from=3700&to=680").from)).toBe("3700")
  })

  test("dates and times survive the round trip", () => {
    const search = { date: "2026-09-06", time: "07:15" }
    const parsed = parse(stringify(search))
    expect([searchString(parsed.date), searchString(parsed.time)]).toEqual(["2026-09-06", "07:15"])
  })

  test("missing and empty values read as undefined", () => {
    expect(searchString(undefined)).toBeUndefined()
    expect(searchString("")).toBeUndefined()
    expect(searchString(Number.NaN)).toBeUndefined()
  })
})
