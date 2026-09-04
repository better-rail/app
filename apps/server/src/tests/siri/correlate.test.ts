import {
  buildCorrelationIndex,
  matchJourney,
  siriIsoToNaiveEpoch,
  visitServiceDate,
  visitTrainNumber,
} from "../../siri/correlate"
import { DayTrips, TripData } from "../../requests/gtfs-route-api"
import { NormalizedVisit } from "../../siri/types"
import { toEpochMs } from "../../utils/gtfs-time"

const DATE = "2026-07-06" // IDT (+03); 2026-01-15 below is IST (+02)

const sec = (clock: string) => clock.split(":").reduce((acc, v, i) => acc + Number(v) * [3600, 60][i], 0)
const ts = (clock: string, date = DATE) => toEpochMs(date, sec(clock))

const trip = (tripId: string, trainNumber: number, routeId: string, stops: [number, string][]): TripData => ({
  tripKey: `${DATE}#${tripId}`,
  trainNumber,
  routeId,
  stops: stops.map(([railId, clock]) => ({ railId, platform: 1, arrTs: ts(clock), depTs: ts(clock) })),
})

const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

// stop_code -> rail_id, as station_map provides it
const stopCodes = new Map([
  ["17038", 3700],
  ["17039", 3500],
  ["17040", 3400],
])

const visit = (overrides: Partial<NormalizedVisit>): NormalizedVisit => ({
  monitoringRef: "17038",
  lineRef: "R1",
  dataFrameRef: DATE,
  originRef: "17038",
  destinationRef: "17040",
  originAimedDeparture: "2026-07-06T08:00:00+03:00",
  ...overrides,
})

describe("siriIsoToNaiveEpoch", () => {
  it("anchors the literal wall clock for Israeli +02/+03 offsets", () => {
    expect(siriIsoToNaiveEpoch("2026-07-06T08:30:00+03:00")).toBe(ts("08:30"))
    expect(siriIsoToNaiveEpoch("2026-01-15T08:30:00+02:00")).toBe(ts("08:30", "2026-01-15"))
    expect(siriIsoToNaiveEpoch("2026-07-06T08:30:00.500+03:00")).toBe(ts("08:30"))
  })

  it("converts other offsets through the real instant (DST-aware)", () => {
    // 05:30Z in July = 08:30 IDT; 06:30Z in January = 08:30 IST.
    expect(siriIsoToNaiveEpoch("2026-07-06T05:30:00Z")).toBe(ts("08:30"))
    expect(siriIsoToNaiveEpoch("2026-01-15T06:30:00Z")).toBe(ts("08:30", "2026-01-15"))
  })

  it("returns null for unparsable input", () => {
    expect(siriIsoToNaiveEpoch("not a time")).toBeNull()
  })
})

describe("visitServiceDate", () => {
  it("prefers DataFrameRef, falls back to the departure's date", () => {
    expect(visitServiceDate(visit({}))).toBe(DATE)
    expect(visitServiceDate(visit({ dataFrameRef: undefined }))).toBe(DATE)
    expect(visitServiceDate(visit({ dataFrameRef: undefined, originAimedDeparture: undefined }))).toBeNull()
  })
})

describe("visitTrainNumber", () => {
  it("reads short numeric refs as train numbers, rejecting 8-digit MOT trip ids", () => {
    expect(visitTrainNumber(visit({ datedVehicleJourneyRef: "751" }))).toBe(751)
    expect(visitTrainNumber(visit({ datedVehicleJourneyRef: "20925867", publishedLineName: "751" }))).toBe(751)
    expect(visitTrainNumber(visit({ datedVehicleJourneyRef: "20925867", publishedLineName: "561א" }))).toBeUndefined()
    expect(visitTrainNumber(visit({}))).toBeUndefined()
  })
})

describe("matchJourney", () => {
  const index = buildCorrelationIndex(
    DATE,
    table(
      trip("a", 101, "R1", [
        [3700, "08:00"],
        [3500, "08:20"],
        [3400, "08:35"],
      ]),
      trip("b", 102, "R1", [
        [3700, "09:00"],
        [3400, "09:30"],
      ]),
      // two same-route trips departing the same minute, different destinations
      trip("c", 201, "R2", [
        [3700, "10:00"],
        [3400, "10:35"],
      ]),
      trip("d", 202, "R2", [
        [3700, "10:00"],
        [3500, "10:20"],
      ]),
    ),
  )
  const getIndex = (date: string) => (date === DATE ? index : undefined)

  // The shape production rail visits actually have: LineRef from a foreign id
  // space, no OriginRef, and the train number in DatedVehicleJourneyRef +
  // PublishedLineName.
  it("matches rail visits by train number despite a foreign LineRef and no OriginRef", () => {
    const result = matchJourney(
      visit({
        lineRef: "30315",
        originRef: undefined,
        datedVehicleJourneyRef: "101",
        publishedLineName: "101",
        originAimedDeparture: "2026-07-06T08:00:00+03:00",
      }),
      getIndex,
      stopCodes,
    )
    expect(result).toMatchObject({ ok: true, path: "train-number" })
    expect((result as any).tripRef.trainNumber).toBe(101)
  })

  it("rejects a train-number hit whose departure is hours off (wrong-day guard)", () => {
    const result = matchJourney(
      visit({
        lineRef: "30315",
        originRef: undefined,
        datedVehicleJourneyRef: "101",
        originAimedDeparture: "2026-07-06T20:00:00+03:00",
      }),
      getIndex,
      stopCodes,
    )
    expect(result).toEqual({ ok: false, reason: "no-match" })
  })

  it("matches by train number without a departure time, but only on the reported date", () => {
    const base = { lineRef: undefined, originRef: undefined, originAimedDeparture: undefined, datedVehicleJourneyRef: "101" }
    const onDate = matchJourney(visit(base), getIndex, stopCodes)
    expect(onDate).toMatchObject({ ok: true, path: "train-number" })

    // Reported date has no index and D±1 can't be trusted without a time check.
    const wrongDate = matchJourney(visit({ ...base, dataFrameRef: "2026-07-07" }), getIndex, stopCodes)
    expect(wrongDate).toEqual({ ok: false, reason: "no-match" })
  })

  it("matches on LineRef + service date + origin departure (primary)", () => {
    const result = matchJourney(visit({}), getIndex, stopCodes)
    expect(result).toMatchObject({ ok: true, path: "primary" })
    expect((result as any).tripRef.trainNumber).toBe(101)
  })

  it("tolerates the aimed departure drifting up to 2 minutes", () => {
    for (const [clock, train] of [
      ["08:01:00", 101],
      ["08:02:00", 101],
      ["08:59:00", 102],
    ] as const) {
      const result = matchJourney(visit({ originAimedDeparture: `2026-07-06T${clock}+03:00` }), getIndex, stopCodes)
      expect(result).toMatchObject({ ok: true })
      expect((result as any).tripRef.trainNumber).toBe(train)
    }
  })

  it("gives up beyond the 2-minute probe", () => {
    const result = matchJourney(
      visit({ originAimedDeparture: "2026-07-06T08:04:00+03:00", originRef: undefined }),
      getIndex,
      stopCodes,
    )
    expect(result).toEqual({ ok: false, reason: "no-match" })
  })

  it("reports ambiguity instead of guessing", () => {
    const result = matchJourney(
      visit({ lineRef: "R2", originAimedDeparture: "2026-07-06T10:00:00+03:00", originRef: undefined }),
      getIndex,
      stopCodes,
    )
    expect(result).toEqual({ ok: false, reason: "ambiguous" })
  })

  it("resolves ambiguity via the DestinationRef tiebreak in the fallback", () => {
    const result = matchJourney(
      visit({ lineRef: "R2", originAimedDeparture: "2026-07-06T10:00:00+03:00", destinationRef: "17039" }),
      getIndex,
      stopCodes,
    )
    expect(result).toMatchObject({ ok: true, path: "fallback" })
    expect((result as any).tripRef.trainNumber).toBe(202)
  })

  it("falls back to OriginRef + departure when LineRef doesn't match our feed", () => {
    const result = matchJourney(visit({ lineRef: "R999" }), getIndex, stopCodes)
    expect(result).toMatchObject({ ok: true, path: "fallback" })
    expect((result as any).tripRef.trainNumber).toBe(101)
  })

  it("probes D±1 when the reported service date misses", () => {
    // DataFrameRef says next day, but the trip lives on DATE's index.
    const result = matchJourney(visit({ dataFrameRef: "2026-07-07" }), getIndex, stopCodes)
    expect(result).toMatchObject({ ok: true, path: "primary" })
    expect((result as any).tripRef.serviceDate).toBe(DATE)
  })

  it("fails cleanly without a departure time or index", () => {
    expect(matchJourney(visit({ originAimedDeparture: undefined }), getIndex, stopCodes)).toEqual({
      ok: false,
      reason: "no-departure-time",
    })
    expect(matchJourney(visit({}), () => undefined, stopCodes)).toEqual({ ok: false, reason: "no-match" })
  })
})
