import { planTravels, DayTrips, TripData, StopNode } from "../requests/gtfs-route-api"
import { toEpochMs } from "../utils/gtfs-time"

const DATE = "2026-06-27"
const ts = (clock: string) => toEpochMs(DATE, clock.split(":").reduce((acc, v, i) => acc + Number(v) * [3600, 60][i], 0))

// Build a trip from [station, "HH:MM", platform] stops (arr == dep for simplicity).
const trip = (tripId: string, trainNumber: number, stops: [number, string, number][]): TripData => ({
  tripKey: `${DATE}#${tripId}`,
  trainNumber,
  stops: stops.map(
    ([railId, clock, platform]): StopNode => ({ railId, platform, arrTs: ts(clock), depTs: ts(clock) }),
  ),
})

const table = (...trips: TripData[]): DayTrips => new Map(trips.map((t) => [t.tripKey, t]))

describe("planTravels", () => {
  it("finds direct trains and orders them by departure", () => {
    const trips = table(
      trip("a", 101, [[3700, "08:00", 1], [3500, "08:20", 2], [3400, "08:35", 1]]),
      trip("b", 102, [[3700, "09:00", 3], [3400, "09:30", 1]]),
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t) => t.trains[0].trainNumber)).toEqual([101, 102])
    // first leg origin/destination + intermediate stop on train 101
    expect(travels[0].trains).toHaveLength(1)
    expect(travels[0].trains[0].orignStation).toBe(3700)
    expect(travels[0].trains[0].destinationStation).toBe(3400)
    expect(travels[0].trains[0].stopStations.map((s: { stationId: number }) => s.stationId)).toEqual([3500])
    // routeStations is the full physical run including endpoints
    expect(travels[0].trains[0].routeStations.map((s: { stationId: number }) => s.stationId)).toEqual([3700, 3500, 3400])
    // routeStations.arrivalTime is a bare "HH:mm" string (like the legacy API), not full ISO
    expect(travels[0].trains[0].routeStations.map((s: { arrivalTime: string }) => s.arrivalTime)).toEqual(["08:00", "08:20", "08:35"])
    expect(travels[0].trains[0].departureTime).toBe("2026-06-27T08:00:00")
    expect(travels[0].trains[0].destPlatform).toBe(1)
    expect(travels[0].trains[0].trainPosition.calcDiffMinutes).toBe(0)
  })

  it("shows the boarding station's arrival_time as the departure (Israel Railways platform dwell)", () => {
    // Hadera West: the train arrives 09:10, dwells, departs 09:12. The legacy
    // rail.co.il API surfaced 09:10 (the platform/arrival time), so we must too.
    const dwellTrip: TripData = {
      tripKey: `${DATE}#dwell`,
      trainNumber: 500,
      stops: [
        { railId: 3100, platform: 1, arrTs: ts("09:10"), depTs: ts("09:12") },
        { railId: 2800, platform: 2, arrTs: ts("09:23"), depTs: ts("09:23") },
      ],
    }
    const travels = planTravels(table(dwellTrip), 3100, 2800, ts("07:00"))
    expect(travels).toHaveLength(1)
    expect(travels[0].trains[0].departureTime).toBe("2026-06-27T09:10:00") // arrival_time, not 09:12
    expect(travels[0].trains[0].arrivalTime).toBe("2026-06-27T09:23:00")
    expect(travels[0].trains[0].routeStations[0].arrivalTime).toBe("09:10")
  })

  it("uses departure_time at Savidor (long-dwell hub) but arrival_time elsewhere", () => {
    // Savidor: arrives 08:00, dwells, departs 08:04. Hadera West (non-Savidor) keeps arrival_time.
    const savidorTrip: TripData = {
      tripKey: `${DATE}#sav`,
      trainNumber: 600,
      stops: [
        { railId: 3700, platform: 3, arrTs: ts("08:00"), depTs: ts("08:04") }, // Savidor origin
        { railId: 3100, platform: 1, arrTs: ts("08:40"), depTs: ts("08:42") }, // Hadera West dest
      ],
    }
    const travels = planTravels(table(savidorTrip), 3700, 3100, ts("07:00"))
    expect(travels[0].trains[0].departureTime).toBe("2026-06-27T08:04:00") // Savidor -> departure_time
    expect(travels[0].trains[0].arrivalTime).toBe("2026-06-27T08:40:00") // Hadera -> arrival_time
    expect(travels[0].trains[0].routeStations[0].arrivalTime).toBe("08:04") // Savidor in route uses dep too
  })

  it("excludes trains that already departed before the query time", () => {
    const trips = table(trip("a", 101, [[3700, "06:00", 1], [3400, "06:30", 1]]))
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels).toHaveLength(0)
  })

  it("builds a one-transfer itinerary when no direct train exists", () => {
    const trips = table(
      // 3700 -> 2300 (hub), then 2300 -> 1300
      trip("a", 201, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      trip("b", 202, [[2300, "08:50", 5], [1300, "09:30", 1]]),
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"))
    expect(travels).toHaveLength(1)
    expect(travels[0].trains.map((t: { trainNumber: number }) => t.trainNumber)).toEqual([201, 202])
    expect(travels[0].departureTime).toBe("2026-06-27T08:00:00")
    expect(travels[0].arrivalTime).toBe("2026-06-27T09:30:00")
    // exchange platforms preserved from each leg
    expect(travels[0].trains[0].destPlatform).toBe(2)
    expect(travels[0].trains[1].originPlatform).toBe(5)
  })

  it("respects the minimum transfer time (skips an impossible connection)", () => {
    const trips = table(
      trip("a", 201, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      // departs only 2 min after arrival -> below the 5-min minimum -> not boardable
      trip("b", 202, [[2300, "08:42", 5], [1300, "09:30", 1]]),
      trip("c", 203, [[2300, "08:50", 5], [1300, "09:40", 1]]),
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"))
    expect(travels[0].trains.map((t: { trainNumber: number }) => t.trainNumber)).toEqual([201, 203])
  })

  it("uses the 5-min minimum, skipping an earlier 4-min option when a comfortable change exists", () => {
    const trips = table(
      trip("f1", 10, [[900, "08:00", 1], [2300, "08:30", 1]]),
      trip("tight", 20, [[2300, "08:34", 1], [999, "09:00", 1]]), // 4-min change, arrives 09:00
      trip("comfy", 21, [[2300, "08:50", 1], [999, "09:20", 1]]), // 20-min change, arrives 09:20
    )
    const travels = planTravels(trips, 900, 999, ts("07:00"))
    // a >=5-min change waits only 20 min (<=30) -> take it, even though the 4-min arrives earlier
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([10, 21])
    expect(travels[0].arrivalTime).toBe("2026-06-27T09:20:00")
  })

  it("drops to a 4-min change when the 5-min option would wait over 30 min", () => {
    const trips = table(
      trip("f1", 10, [[900, "08:00", 1], [2300, "08:30", 1]]),
      trip("tight", 20, [[2300, "08:34", 1], [999, "09:00", 1]]), // 4-min change, arrives 09:00
      trip("late", 21, [[2300, "09:05", 1], [999, "09:35", 1]]), // 35-min change (>30)
    )
    const travels = planTravels(trips, 900, 999, ts("07:00"))
    // the only >=5-min change waits 35 min -> drop to the 4-min change to avoid it
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([10, 20])
    expect(travels[0].arrivalTime).toBe("2026-06-27T09:00:00")
  })

  it("rejects a transfer that requires waiting more than an hour", () => {
    const trips = table(
      trip("a", 200, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      // only onward train departs 80 min after arrival -> over the 1h cap -> dropped
      trip("b", 201, [[2300, "10:00", 5], [1300, "10:30", 1]]),
    )
    expect(planTravels(trips, 3700, 1300, ts("07:00"))).toHaveLength(0)
    // …but a 35-minute connection is fine.
    const ok = table(
      trip("a", 200, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      trip("b", 202, [[2300, "09:15", 5], [1300, "09:45", 1]]),
    )
    expect(planTravels(ok, 3700, 1300, ts("07:00"))[0].trains.map((t: { trainNumber: number }) => t.trainNumber)).toEqual([200, 202])
  })

  it("bounds results to the requested day via endTs", () => {
    const trips = table(
      trip("a", 10, [[3700, "23:30", 1], [3400, "23:55", 1]]), // departs within the day
      trip("b", 11, [[3700, "24:30", 1], [3400, "24:55", 1]]), // 00:30 next day -> excluded
    )
    const endTs = ts("24:00") // start of the next day
    const travels = planTravels(trips, 3700, 3400, ts("07:00"), endTs)
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([10])
  })

  it("drops a route that leaves earlier but arrives much later than another", () => {
    const trips = table(
      trip("slowA", 1, [[3700, "04:51", 1], [2300, "05:30", 2]]), // 1-change leg 1…
      trip("slowB", 2, [[2300, "05:40", 5], [3400, "06:19", 1]]), // …arrives 06:19
      trip("fast", 3, [[3700, "04:55", 1], [3400, "05:42", 1]]), // direct, arrives 05:42
    )
    const travels = planTravels(trips, 3700, 3400, ts("03:00"))
    // 04:55->05:42 dominates 04:51->06:19 (departs later, arrives earlier) -> drop the 04:51
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([3])
  })

  it("keeps a direct train even when a later departure with a change arrives sooner", () => {
    // Real case: Ra'anana West -> TLV HaShalom. Train 647 (direct via the Sharon
    // loop, dep 13:54, arr 14:41) must not be dropped for the 14:05 ride-north-to-
    // Herzliya + change option arriving 14:39 — more changes never dominate fewer.
    const trips = table(
      trip("direct", 647, [[2940, "13:54", 2], [4600, "14:41", 3]]),
      trip("north", 644, [[2940, "14:05", 1], [3500, "14:11", 4]]),
      trip("south", 749, [[3500, "14:24", 3], [4600, "14:39", 2]]),
    )
    const travels = planTravels(trips, 2940, 4600, ts("13:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[647], [644, 749]])
  })

  it("lists a direct train shadowed by a faster direct train unless slow trains are hidden", () => {
    // Real case: Ashkelon -> TLV HaShalom. Train 230 (07:00 -> 07:56) is dominated by
    // 622 (07:06 -> 07:50); only the "hide slow trains" toggle should drop it.
    const trips = table(
      trip("slow", 230, [[5900, "07:00", 1], [4600, "07:56", 2]]),
      trip("fast", 622, [[5900, "07:06", 1], [4600, "07:50", 3]]),
      trip("next", 232, [[5900, "07:30", 1], [4600, "08:26", 2]]),
    )
    const numbers = (travels: any[]) => travels.map((t) => t.trains[0].trainNumber)
    expect(numbers(planTravels(trips, 5900, 4600, ts("06:00")))).toEqual([230, 622, 232])
    const hidden = planTravels(trips, 5900, 4600, ts("06:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(numbers(hidden)).toEqual([622, 232])
  })

  it("hides a route a later departure catches up with (hide slow trains)", () => {
    // Real case: Hadera West -> Be'er Sheva Merkaz. The 18:17 change arrives 20:50,
    // but the 19:08 direct arrives 21:03 — 51 min of waiting costs 13 min of arrival,
    // so the slow ride is noise.
    const trips = table(
      trip("legA", 283, [[3100, "18:17", 1], [4600, "19:00", 2]]),
      trip("legB", 51, [[4600, "19:20", 3], [7320, "20:50", 1]]),
      trip("direct", 425, [[3100, "19:08", 1], [7320, "21:03", 2]]),
    )
    const travels = planTravels(trips, 3100, 7320, ts("17:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([425])
  })

  it("keeps the last slow route before a gap even when an earlier train was far faster", () => {
    // Same route later in the evening: the 19:17 change (arrives 21:55) is much
    // slower than the 19:08 direct, but that one has already left — the next
    // departure only arrives 22:19, so 19:17 is the fastest way out from 19:10.
    const trips = table(
      trip("direct", 425, [[3100, "19:08", 1], [7320, "21:03", 2]]),
      trip("legA", 287, [[3100, "19:17", 1], [4600, "20:00", 2]]),
      trip("legB", 53, [[4600, "20:20", 3], [7320, "21:55", 1]]),
      trip("legC", 289, [[3100, "19:47", 1], [4600, "20:30", 2]]),
      trip("legD", 683, [[4600, "20:50", 3], [7320, "22:19", 1]]),
    )
    const travels = planTravels(trips, 3100, 7320, ts("18:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([425, 287, 289])
  })

  it("keeps a slow route when the faster departure is over an hour of waiting away", () => {
    const trips = table(
      trip("slow", 100, [[3700, "08:00", 1], [3400, "10:00", 1]]), // 2 h
      trip("fast", 101, [[3700, "09:15", 1], [3400, "10:10", 1]]), // arrives 10 min later, 75 min of waiting
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([100, 101])
  })

  it("never hides a route in favour of one with more changes", () => {
    const trips = table(
      trip("direct", 100, [[3700, "08:00", 1], [3400, "09:30", 1]]), // direct, arrives 09:30
      trip("legA", 200, [[3700, "08:20", 1], [2300, "08:40", 2]]), // 1-change…
      trip("legB", 201, [[2300, "08:50", 5], [3400, "09:35", 1]]), // …arrives 09:35
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([100, 200])
  })

  it("still lets a direct train dominate an itinerary with changes when slow trains are shown", () => {
    const trips = table(
      trip("slowA", 1, [[3700, "04:51", 1], [2300, "05:30", 2]]), // 1-change leg 1…
      trip("slowB", 2, [[2300, "05:40", 5], [3400, "06:19", 1]]), // …arrives 06:19
      trip("fast", 3, [[3700, "04:55", 1], [3400, "05:42", 1]]), // direct, arrives 05:42
    )
    const travels = planTravels(trips, 3700, 3400, ts("03:00"), Infinity, undefined, { hideSlowTrains: false })
    // only 0-change itineraries are exempt from dominance pruning
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[3]])
  })

  it("drops itineraries dominated by a shorter route with the same arrival", () => {
    const trips = table(
      trip("a", 100, [[3700, "08:00", 1], [3400, "09:00", 1]]),
      trip("b", 101, [[3700, "08:30", 1], [3400, "09:00", 1]]), // same arrival, later departure
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    // only the shorter (later-departing) route survives
    expect(travels.map((t: any) => t.trains[0].trainNumber)).toEqual([101])
  })

  it("prefers fewer changes when arrival is the same and the penalty is under 20 min", () => {
    const trips = table(
      trip("direct", 100, [[3700, "08:10", 1], [3400, "09:00", 1]]), // direct, 50 min
      trip("legA", 200, [[3700, "08:25", 1], [2300, "08:40", 2]]), // 1-change, 35 min total…
      trip("legB", 201, [[2300, "08:50", 5], [3400, "09:00", 1]]), // …same 09:00 arrival
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    // both arrive 09:00; the direct is only 15 min longer -> prefer it (0 changes)
    expect(travels).toHaveLength(1)
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([100])
  })

  it("keeps the shorter route when the fewer-change option is over 20 min longer", () => {
    const trips = table(
      trip("direct", 100, [[3700, "08:00", 1], [3400, "09:00", 1]]), // direct, 60 min
      trip("legA", 200, [[3700, "08:35", 1], [2300, "08:45", 2]]), // 1-change, 25 min total…
      trip("legB", 201, [[2300, "08:50", 5], [3400, "09:00", 1]]), // …same 09:00 arrival
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    // direct is 35 min longer than the 25-min 1-change -> keep the shorter (1-change)
    expect(travels).toHaveLength(1)
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([200, 201])
  })

  it("prefers a direct train over a transfer for the same first train", () => {
    const trips = table(
      trip("a", 301, [[3700, "08:00", 1], [2300, "08:20", 2], [1300, "09:00", 1]]),
      trip("b", 302, [[2300, "08:30", 5], [1300, "08:45", 1]]),
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"))
    // the 08:00 train reaches 1300 directly; we should not split it into a transfer
    expect(travels[0].trains.map((t: { trainNumber: number }) => t.trainNumber)).toEqual([301])
  })

  describe("realtime (SIRI) injection", () => {
    const trips = () =>
      table(
        trip("a", 101, [[3700, "08:00", 1], [3500, "08:20", 2], [3400, "08:35", 1]]),
        trip("b", 102, [[3700, "09:00", 3], [3400, "09:30", 1]]),
      )

    it("fills calcDiffMinutes and overrides platforms from the lookup", () => {
      const lookup = (serviceDate: string, trainNumber: number, railId: number) => {
        expect(serviceDate).toBe(DATE)
        if (trainNumber !== 101) return { delayMin: 0 }
        return { delayMin: 7, platform: railId === 3500 ? 9 : undefined }
      }
      const travels = planTravels(trips(), 3700, 3400, ts("07:00"), Infinity, lookup)

      const [delayed, onTime] = travels.map((t) => t.trains[0])
      expect(delayed.trainPosition.calcDiffMinutes).toBe(7)
      expect(delayed.stopStations[0].platform).toBe(9) // live platform at 3500
      expect(delayed.routeStations.map((s: { platform: number }) => s.platform)).toEqual([1, 9, 1])
      expect(delayed.originPlatform).toBe(1) // no override -> scheduled platform
      expect(onTime.trainPosition.calcDiffMinutes).toBe(0)
      expect(onTime.originPlatform).toBe(3)
    })

    it("keeps schedule-only output without a lookup (default)", () => {
      const travels = planTravels(trips(), 3700, 3400, ts("07:00"))
      expect(travels[0].trains[0].trainPosition.calcDiffMinutes).toBe(0)
      expect(travels[0].trains[0].stopStations[0].platform).toBe(2)
    })

    it("flags platform changes only when live and scheduled platforms are both known and differ", () => {
      const lookup = (_d: string, trainNumber: number, railId: number) => {
        if (trainNumber !== 101) return { delayMin: 0 }
        // 3700: same as scheduled (1) -> no flag; 3500: 9 vs scheduled 2 -> flag.
        return { delayMin: 0, platform: railId === 3700 ? 1 : railId === 3500 ? 9 : undefined }
      }
      const travels = planTravels(trips(), 3700, 3400, ts("07:00"), Infinity, lookup)

      const train = travels[0].trains[0]
      expect(train.originPlatformChanged).toBeUndefined() // live == scheduled
      expect(train.destPlatformChanged).toBeUndefined() // no live platform at 3400
      expect(train.stopStations[0].platformChanged).toBe(true) // 9 != 2 at 3500
      expect(train.routeStations.map((s: { platformChanged?: boolean }) => s.platformChanged)).toEqual([
        undefined,
        true,
        undefined,
      ])
    })

    it("never flags a change against an unknown (0) scheduled platform", () => {
      const trips0 = table(trip("a", 101, [[3700, "08:00", 0], [3400, "08:35", 1]]))
      const lookup = () => ({ delayMin: 0, platform: 4 })
      const travels = planTravels(trips0, 3700, 3400, ts("07:00"), Infinity, lookup)
      expect(travels[0].trains[0].originPlatform).toBe(4) // live platform still shown
      expect(travels[0].trains[0].originPlatformChanged).toBeUndefined()
    })

    it("marks skipped stops and passes train-level cancellation + live last stop", () => {
      const lookup = (_d: string, trainNumber: number, railId: number) => {
        if (trainNumber !== 101) return { delayMin: 0 }
        return {
          delayMin: 0,
          status: railId === 3500 ? "cancelled" : "onTime",
          trainCancelled: true,
          liveDestRailId: 3500,
        }
      }
      const travels = planTravels(trips(), 3700, 3400, ts("07:00"), Infinity, lookup)

      const [cancelled, onTime] = travels.map((t) => t.trains[0])
      expect(cancelled.isCancelled).toBe(true)
      expect(cancelled.actualLastStationId).toBe(3500)
      expect(cancelled.stopStations[0].cancelled).toBe(true)
      expect(cancelled.routeStations.map((s: { cancelled?: boolean }) => s.cancelled)).toEqual([
        undefined,
        true,
        undefined,
      ])
      expect(onTime.isCancelled).toBeUndefined()
      expect(onTime.actualLastStationId).toBeUndefined()
    })
  })

  describe("transfer-station preference (same trains & arrival)", () => {
    const changeStation = (travels: any) => travels[0].trains[0].destinationStation

    it("moves the change to the station with the larger connection window", () => {
      const trips = table(
        // both trains share 2300 (tight 5m) and 2100 (roomy 15m)
        trip("f1", 10, [[900, "08:00", 1], [2300, "08:30", 1], [2100, "08:40", 1]]),
        trip("f2", 20, [[2300, "08:35", 1], [2100, "08:55", 1], [999, "09:30", 1]]),
      )
      const travels = planTravels(trips, 900, 999, ts("07:00"))
      expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([10, 20])
      expect(changeStation(travels)).toBe(2100) // not the earliest/tight 2300
      expect(travels[0].arrivalTime).toBe("2026-06-27T09:30:00") // arrival unchanged
    })

    it("does a tight Tel Aviv change at Savidor", () => {
      const trips = table(
        // shared TLV stations, all ~4 min (tight): University, Savidor, HaShalom
        trip("f1", 10, [[900, "08:00", 1], [3600, "08:30", 1], [3700, "08:33", 1], [4600, "08:36", 1]]),
        trip("f2", 20, [[3600, "08:34", 1], [3700, "08:37", 1], [4600, "08:40", 1], [999, "09:00", 1]]),
      )
      const travels = planTravels(trips, 900, 999, ts("07:00"))
      expect(changeStation(travels)).toBe(3700) // Savidor, not the earlier University (3600)
    })

    it("does a long (>30 min) Tel Aviv change at Savidor", () => {
      const trips = table(
        // shared TLV stations, all ~35 min (long): University, Savidor, HaShalom
        trip("f1", 10, [[900, "08:00", 1], [3600, "08:30", 1], [3700, "08:33", 1], [4600, "08:36", 1]]),
        trip("f2", 20, [[3600, "09:05", 1], [3700, "09:08", 1], [4600, "09:11", 1], [999, "09:40", 1]]),
      )
      const travels = planTravels(trips, 900, 999, ts("07:00"))
      expect(changeStation(travels)).toBe(3700) // Savidor, even though University (3600) is earlier/equal window
    })

    it("makes the change as early as possible when windows are about the same", () => {
      const trips = table(
        trip("f1", 10, [[900, "08:00", 1], [2300, "08:30", 1], [2100, "08:40", 1]]),
        trip("f2", 20, [[2300, "08:42", 1], [2100, "08:52", 1], [999, "09:30", 1]]), // both ~12m
      )
      const travels = planTravels(trips, 900, 999, ts("07:00"))
      expect(changeStation(travels)).toBe(2300) // earliest shared station
    })
  })
})
