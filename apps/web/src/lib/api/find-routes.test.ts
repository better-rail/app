import { afterEach, describe, expect, mock, test } from "bun:test"
import { TimetableApiError } from "./errors"
import { searchRoutes } from "./find-routes"

const search = { originId: "300", destinationId: "9100", date: "2026-11-14", hour: "12:00", hideSlowTrains: false }
const realFetch = globalThis.fetch
const noService = () => Response.json({ result: { travels: [] } })

function stubFetch(...responses: (() => Response)[]) {
  const stub = mock(() => Promise.resolve((responses.shift() ?? noService)()))
  globalThis.fetch = stub as unknown as typeof fetch
  return stub
}

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("searchRoutes", () => {
  test("asks again when the timetable API fails on its side", async () => {
    const stub = stubFetch(() => new Response(null, { status: 500 }))
    const result = await searchRoutes(search)
    expect(result.resultType).toBe("not-found")
    // The retried day, then the three look-ahead days.
    expect(stub).toHaveBeenCalledTimes(5)
  })

  test("gives up with a TimetableApiError when the retry fails too", async () => {
    stubFetch(
      () => new Response(null, { status: 503 }),
      () => new Response(null, { status: 503 }),
    )
    const error = await searchRoutes(search).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TimetableApiError)
    expect((error as TimetableApiError).status).toBe(503)
  })

  test("does not retry a client error", async () => {
    const stub = stubFetch(() => new Response(null, { status: 400 }))
    await expect(searchRoutes(search)).rejects.toBeInstanceOf(TimetableApiError)
    expect(stub).toHaveBeenCalledTimes(1)
  })
})
