import { TripRef } from "../../siri/correlate"
import { MatchedVisit, buildSnapshot, makeRealtimeLookup, zeroRealtimeLookup } from "../../siri/snapshot"
import { toEpochMs } from "../../utils/gtfs-time"

const DATE = "2026-07-06"
const sec = (clock: string) => clock.split(":").reduce((acc, v, i) => acc + Number(v) * [3600, 60][i], 0)
const ts = (clock: string) => toEpochMs(DATE, sec(clock))

const tripRef = (trainNumber: number, arrs: [number, string][]): TripRef => ({
  trainNumber,
  serviceDate: DATE,
  routeId: "R1",
  originDepTs: ts(arrs[0][1]),
  originRailId: arrs[0][0],
  destRailId: arrs[arrs.length - 1][0],
  arrByRailId: new Map(arrs.map(([railId, clock]) => [railId, ts(clock)])),
})

const matched = (ref: TripRef, railId: number, extra: Partial<MatchedVisit> = {}): MatchedVisit => ({
  tripRef: ref,
  railId,
  expectedArrNaive: null,
  ...extra,
})

describe("buildSnapshot", () => {
  // Savidor case: scheduled arr 08:00 / dep 08:04 — the response *displays*
  // 08:04, but delay must be measured against the scheduled arrival.
  it("measures delay against the scheduled arrival, never the displayed time", () => {
    const ref = tripRef(600, [[3700, "08:00"], [3100, "08:40"]])
    const snapshot = buildSnapshot([matched(ref, 3700, { expectedArrNaive: ts("08:10"), status: "delayed" })], "1", ts("07:00"))
    expect(snapshot.trains[`${DATE}#600`].stations[3700].delayMin).toBe(10)
  })

  it("keeps cancelled/noReport stations without a delay value", () => {
    const ref = tripRef(600, [[3700, "08:00"], [3100, "08:40"]])
    const snapshot = buildSnapshot(
      [
        matched(ref, 3700, { expectedArrNaive: ts("08:05"), status: "cancelled" }),
        matched(ref, 3100, { expectedArrNaive: ts("08:46"), status: "delayed" }),
      ],
      "1",
      ts("08:00"),
    )
    const train = snapshot.trains[`${DATE}#600`]
    expect(train.stations[3700].delayMin).toBeNull()
    expect(train.stations[3700].status).toBe("cancelled")
    expect(train.stations[3100].delayMin).toBe(6)
    expect(train.latestDelayMin).toBe(6)
  })

  it("sets the train-level delay from the nearest upcoming stop, else the latest past one", () => {
    const ref = tripRef(700, [[3700, "08:00"], [3500, "08:20"], [3400, "08:40"]])
    const visits = [
      matched(ref, 3700, { expectedArrNaive: ts("08:10") }), // +10
      matched(ref, 3500, { expectedArrNaive: ts("08:28") }), // +8
      matched(ref, 3400, { expectedArrNaive: ts("08:46") }), // +6
    ]
    // Now = 08:25 -> nearest upcoming is 3500's 08:28 -> 8.
    expect(buildSnapshot(visits, "1", ts("08:25")).trains[`${DATE}#700`].latestDelayMin).toBe(8)
    // Now = 09:00 -> all past -> the latest one (3400's 08:46) -> 6.
    expect(buildSnapshot(visits, "1", ts("09:00")).trains[`${DATE}#700`].latestDelayMin).toBe(6)
  })

  it("stores raw negative delays (clamping happens in the lookup)", () => {
    const ref = tripRef(800, [[3700, "08:00"]])
    const snapshot = buildSnapshot([matched(ref, 3700, { expectedArrNaive: ts("07:58") })], "1", ts("07:00"))
    expect(snapshot.trains[`${DATE}#800`].stations[3700].delayMin).toBe(-2)
  })

  it("marks the train cancelled only when 2+ monitored stations all report cancelled", () => {
    const ref = tripRef(600, [[3700, "08:00"], [3500, "08:20"], [3100, "08:40"]])
    const allCancelled = buildSnapshot(
      [matched(ref, 3700, { status: "cancelled" }), matched(ref, 3100, { status: "cancelled" })],
      "1",
      ts("07:00"),
    )
    expect(allCancelled.trains[`${DATE}#600`].cancelled).toBe(true)

    // One skipped stop among live ones is a stop cancellation, not a train cancellation.
    const oneSkipped = buildSnapshot(
      [matched(ref, 3700, { status: "cancelled" }), matched(ref, 3100, { status: "onTime" })],
      "1",
      ts("07:00"),
    )
    expect(oneSkipped.trains[`${DATE}#600`].cancelled).toBeUndefined()

    // A single monitored station can't distinguish skip vs full cancellation.
    const singleStation = buildSnapshot([matched(ref, 3700, { status: "cancelled" })], "1", ts("07:00"))
    expect(singleStation.trains[`${DATE}#600`].cancelled).toBeUndefined()
  })

  it("keeps the live destination only when it differs from the scheduled one", () => {
    const ref = tripRef(600, [[3700, "08:00"], [3100, "08:40"]])
    const curtailed = buildSnapshot([matched(ref, 3700, { destRailId: 3500 })], "1", ts("07:00"))
    expect(curtailed.trains[`${DATE}#600`].liveDestRailId).toBe(3500)

    const asScheduled = buildSnapshot([matched(ref, 3700, { destRailId: 3100 })], "1", ts("07:00"))
    expect(asScheduled.trains[`${DATE}#600`].liveDestRailId).toBeUndefined()
  })
})

describe("carry-forward", () => {
  // Train 244: Savidor 11:32 -> Herzliya 11:50 -> Binyamina 12:10. The feed is
  // forward-looking, so Savidor's visit vanishes the moment the train departs.
  const ref = tripRef(244, [[3700, "11:32"], [3500, "11:50"], [3400, "12:10"]])

  const beforeDeparture = () =>
    buildSnapshot(
      [
        matched(ref, 3700, { expectedArrNaive: ts("11:32"), platform: 5, status: "onTime" }),
        matched(ref, 3500, { expectedArrNaive: ts("11:58"), status: "delayed" }),
      ],
      "1",
      ts("11:30"),
    )

  it("keeps a departed station's platform and status after its visit leaves the feed", () => {
    const after = buildSnapshot(
      [matched(ref, 3500, { expectedArrNaive: ts("11:58"), status: "delayed" })],
      "1",
      ts("11:35"),
      beforeDeparture(),
    )
    expect(after.trains[`${DATE}#244`].stations[3700]).toMatchObject({ platform: 5, status: "onTime", seenAt: ts("11:35") })

    const lookup = makeRealtimeLookup(after, after.updatedAt)
    expect(lookup(DATE, 244, 3700).platform).toBe(5)
  })

  it("lets live data win over carried data", () => {
    const after = buildSnapshot(
      [matched(ref, 3700, { expectedArrNaive: ts("11:33"), platform: 6, status: "delayed" })],
      "1",
      ts("11:31"),
      beforeDeparture(),
    )
    const station = after.trains[`${DATE}#244`].stations[3700]
    expect(station).toMatchObject({ platform: 6, status: "delayed" })
    expect(station.seenAt).toBeUndefined()
  })

  it("serves the current train delay, not the carried one, while the train runs", () => {
    // Left Savidor on time; now running 8 late toward Herzliya — the departed
    // stop must report the train's current delay, not its own history.
    const after = buildSnapshot([matched(ref, 3500, { expectedArrNaive: ts("11:58") })], "1", ts("11:35"), beforeDeparture())
    const lookup = makeRealtimeLookup(after, after.updatedAt)
    expect(lookup(DATE, 244, 3700)).toMatchObject({ delayMin: 8, platform: 5 })
  })

  it("freezes the whole train once it leaves the feed", () => {
    const mid = buildSnapshot([matched(ref, 3500, { expectedArrNaive: ts("11:58"), status: "delayed" })], "1", ts("11:35"), beforeDeparture())
    const after = buildSnapshot([], "1", ts("12:20"), mid)
    const train = after.trains[`${DATE}#244`]
    expect(train.ended).toBe(true)
    expect(train.latestDelayMin).toBe(8)
    // Carried entries keep their original seenAt across cycles.
    expect(train.stations[3700]).toMatchObject({ platform: 5, seenAt: ts("11:35") })

    // Once the run is over, the per-station history is the delay answer.
    const lookup = makeRealtimeLookup(after, after.updatedAt)
    expect(lookup(DATE, 244, 3700)).toMatchObject({ delayMin: 0, platform: 5 })
    expect(lookup(DATE, 244, 3500).delayMin).toBe(8)
  })

  it("expires carried entries after the carry window", () => {
    const mid = buildSnapshot([], "1", ts("11:35"), beforeDeparture())
    expect(mid.trains[`${DATE}#244`]).toBeDefined()

    // 24h+ later ("35:36" in extended-time form): a live train drops expired
    // carried stations...
    const live = buildSnapshot([matched(ref, 3400, { expectedArrNaive: ts("35:40") })], "1", ts("35:36"), mid)
    expect(live.trains[`${DATE}#244`].stations[3400]).toBeDefined()
    expect(live.trains[`${DATE}#244`].stations[3700]).toBeUndefined()

    // ...and a carried train disappears once every entry has expired.
    const gone = buildSnapshot([], "1", ts("35:36"), mid)
    expect(gone.trains[`${DATE}#244`]).toBeUndefined()
  })

  it("keeps carried future predictions out of the train-level delay", () => {
    // Curtailed at Herzliya: Binyamina's visit (still in the future, +20)
    // vanished from the feed while Herzliya keeps reporting live (+3).
    const before = buildSnapshot(
      [
        matched(ref, 3500, { expectedArrNaive: ts("11:53") }),
        matched(ref, 3400, { expectedArrNaive: ts("12:30") }),
      ],
      "1",
      ts("11:40"),
    )
    const after = buildSnapshot([matched(ref, 3500, { expectedArrNaive: ts("11:53"), status: "arrived" })], "1", ts("11:55"), before)
    const train = after.trains[`${DATE}#244`]
    expect(train.stations[3400]).toMatchObject({ delayMin: 20, seenAt: ts("11:55") })
    expect(train.latestDelayMin).toBe(3)
  })

  it("keeps a whole-run cancellation while cancelled visits age out of the feed", () => {
    const before = buildSnapshot(
      [matched(ref, 3700, { status: "cancelled" }), matched(ref, 3500, { status: "cancelled" })],
      "1",
      ts("11:00"),
    )
    expect(before.trains[`${DATE}#244`].cancelled).toBe(true)

    // Down to a single monitored visit — the 2+ rule alone can't see it anymore.
    const after = buildSnapshot([matched(ref, 3500, { status: "cancelled" })], "1", ts("11:40"), before)
    expect(after.trains[`${DATE}#244`].cancelled).toBe(true)

    // ...but a live visit that stops reporting cancelled clears it (un-cancelled run).
    const revived = buildSnapshot([matched(ref, 3500, { status: "onTime", expectedArrNaive: ts("11:50") })], "1", ts("11:40"), before)
    expect(revived.trains[`${DATE}#244`].cancelled).toBeUndefined()
  })

  it("keeps the previous train-level delay through a noReport blackout", () => {
    const before = buildSnapshot([matched(ref, 3500, { expectedArrNaive: ts("11:58") })], "1", ts("11:35"))
    const blackout = buildSnapshot([matched(ref, 3500, { status: "noReport" })], "1", ts("11:36"), before)
    expect(blackout.trains[`${DATE}#244`].latestDelayMin).toBe(8)
  })
})

describe("makeRealtimeLookup", () => {
  const ref = tripRef(600, [[3700, "08:00"], [3100, "08:40"]])
  const snapshot = buildSnapshot(
    [
      matched(ref, 3700, { expectedArrNaive: ts("08:10"), platform: 4 }),
      matched(ref, 3100, { expectedArrNaive: ts("08:38") }), // -2 (early)
    ],
    "1",
    ts("07:00"),
  )

  it("returns the station's delay and live platform", () => {
    const lookup = makeRealtimeLookup(snapshot, snapshot.updatedAt)
    expect(lookup(DATE, 600, 3700)).toMatchObject({ delayMin: 10, platform: 4 })
  })

  it("passes station status and train-level cancellation/destination through", () => {
    const cancelledSnapshot = buildSnapshot(
      [
        matched(ref, 3700, { status: "cancelled", destRailId: 3500 }),
        matched(ref, 3100, { status: "cancelled" }),
      ],
      "1",
      ts("07:00"),
    )
    const lookup = makeRealtimeLookup(cancelledSnapshot, cancelledSnapshot.updatedAt)
    expect(lookup(DATE, 600, 3700)).toMatchObject({ status: "cancelled", trainCancelled: true, liveDestRailId: 3500 })
    // Unmonitored station: no per-station status, train-level fields still present.
    expect(lookup(DATE, 600, 3500)).toMatchObject({ status: undefined, trainCancelled: true, liveDestRailId: 3500 })
  })

  it("clamps negative delays to 0", () => {
    const lookup = makeRealtimeLookup(snapshot, snapshot.updatedAt)
    expect(lookup(DATE, 600, 3100).delayMin).toBe(0)
  })

  it("falls back to the train-level delay for unmonitored stations", () => {
    const lookup = makeRealtimeLookup(snapshot, snapshot.updatedAt)
    // 3500 isn't in the snapshot -> latestDelayMin (10, the upcoming 3700 stop
    // relative to the build time) with no platform override.
    expect(lookup(DATE, 600, 3500)).toEqual({ delayMin: 10, platform: undefined })
  })

  it("returns zeros for unknown trains", () => {
    const lookup = makeRealtimeLookup(snapshot, snapshot.updatedAt)
    expect(lookup(DATE, 999, 3700)).toEqual({ delayMin: 0 })
    expect(lookup("2026-07-07", 600, 3700)).toEqual({ delayMin: 0 })
  })

  it("reverts to schedule-only once the snapshot goes stale", () => {
    const fresh = makeRealtimeLookup(snapshot, snapshot.updatedAt + 599_000)
    expect(fresh(DATE, 600, 3700).delayMin).toBe(10)

    const stale = makeRealtimeLookup(snapshot, snapshot.updatedAt + 601_000)
    expect(stale).toBe(zeroRealtimeLookup)
    expect(stale(DATE, 600, 3700)).toEqual({ delayMin: 0 })
  })

  it("treats a missing snapshot as schedule-only", () => {
    expect(makeRealtimeLookup(null)).toBe(zeroRealtimeLookup)
  })
})
