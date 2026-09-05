import fixture from "./fixtures/stop-monitoring.json"
import { buildStopMonitoringUrl, parseStopMonitoringResponse, redactKey, refValue } from "../../siri/client"

const opts = { url: "https://siri.example/SmQuery/2.8", key: "GT000000", preview: "PT90M" }

describe("buildStopMonitoringUrl", () => {
  it("builds a /json request with comma-separated MonitoringRef values", () => {
    expect(buildStopMonitoringUrl(["17038", "17040"], opts)).toBe(
      "https://siri.example/SmQuery/2.8/json?Key=GT000000&MonitoringRef=17038,17040&PreviewInterval=PT90M",
    )
  })

  it("keeps MonitoringRef as the only multi-valued parameter", () => {
    // The API rejects requests with two multi-valued params; the builder takes
    // no other list-typed input, so the rule holds structurally.
    const url = buildStopMonitoringUrl(["1", "2", "3"], opts)
    const multiValued = [...new URL(url).searchParams.entries()].filter(([, v]) => v.includes(","))
    expect(multiValued.map(([k]) => k)).toEqual(["MonitoringRef"])
  })

  it("rejects an empty stop-code list", () => {
    expect(() => buildStopMonitoringUrl([], opts)).toThrow()
  })
})

describe("redactKey", () => {
  it("hides the access key in URLs and error messages", () => {
    const url = buildStopMonitoringUrl(["17038"], opts)
    expect(redactKey(url)).not.toContain("GT000000")
    expect(redactKey(`fetch failed for ${url}`)).toContain("Key=***")
    expect(redactKey("plain message")).toBe("plain message")
  })
})

describe("refValue", () => {
  it("normalizes strings, numbers and { value } wrappers", () => {
    expect(refValue("17038")).toBe("17038")
    expect(refValue(17038)).toBe("17038")
    expect(refValue({ value: 17038 })).toBe("17038")
    expect(refValue({ value: "17038" })).toBe("17038")
    expect(refValue("")).toBeUndefined()
    expect(refValue(null)).toBeUndefined()
    expect(refValue(undefined)).toBeUndefined()
  })
})

describe("parseStopMonitoringResponse", () => {
  it("extracts normalized visits and body errors from a response", () => {
    const { visits, errors } = parseStopMonitoringResponse(fixture)

    expect(errors).toEqual(["No such stop: 99999"])
    expect(visits).toHaveLength(2)

    // Plain-string refs.
    const [first, second] = visits
    expect(first.monitoringRef).toBe("17038")
    expect(first.lineRef).toBe("34073")
    expect(first.dataFrameRef).toBe("2026-07-06")
    expect(first.originAimedDeparture).toBe("2026-07-06T08:00:00+03:00")
    expect(first.expectedArrival).toBe("2026-07-06T08:10:00+03:00")
    expect(first.arrivalStatus).toBe("delayed")
    expect(first.arrivalPlatform).toBe("4")
    expect(first.publishedLineName).toBe("123")
    expect(first.location).toEqual({ lat: 32.083744, lon: 34.798579 })

    // Number / { value } wrapped refs normalize to the same strings; a missing
    // MonitoredCall leaves the call fields undefined.
    expect(second.monitoringRef).toBe("17040")
    expect(second.lineRef).toBe("34073")
    expect(second.dataFrameRef).toBe("2026-07-06")
    expect(second.originRef).toBe("17038")
    expect(second.expectedArrival).toBeUndefined()
    expect(second.location).toBeUndefined()
  })

  it("handles single-object (non-array) deliveries and visits", () => {
    const single = {
      Siri: {
        ServiceDelivery: {
          StopMonitoringDelivery: {
            MonitoredStopVisit: {
              MonitoringRef: "17038",
              MonitoredVehicleJourney: { LineRef: "34073" },
            },
          },
        },
      },
    }
    const { visits, errors } = parseStopMonitoringResponse(single)
    expect(errors).toEqual([])
    expect(visits).toHaveLength(1)
    expect(visits[0].lineRef).toBe("34073")
  })

  it("returns nothing for an empty or malformed body", () => {
    expect(parseStopMonitoringResponse({})).toEqual({ visits: [], errors: [] })
    expect(parseStopMonitoringResponse(null)).toEqual({ visits: [], errors: [] })
  })
})
