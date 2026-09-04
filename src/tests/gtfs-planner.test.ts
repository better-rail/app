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
    // routeStations.arrivalTime is a bare "HH:mm" string, not full ISO
    expect(travels[0].trains[0].routeStations.map((s: { arrivalTime: string }) => s.arrivalTime)).toEqual(["08:00", "08:20", "08:35"])
    expect(travels[0].trains[0].departureTime).toBe("2026-06-27T08:00:00")
    expect(travels[0].trains[0].destPlatform).toBe(1)
    expect(travels[0].trains[0].trainPosition.calcDiffMinutes).toBe(0)
  })

  it("shows the boarding station's arrival_time as the departure (platform dwell)", () => {
    // Hadera West: the train arrives 09:10, dwells, departs 09:12. The platform
    // time a rider goes by is 09:10, so that is what we surface.
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
    // the tight change saves exactly 20 min, which is not *more* than the bar -> keep the safe one
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([10, 21])
    expect(travels[0].arrivalTime).toBe("2026-06-27T09:20:00")
  })

  it("takes a four-minute change only when it actually saves the rider time", () => {
    const first = trip("f1", 10, [[900, "08:00", 1], [3600, "08:30", 1]])
    const numbers = (trips: DayTrips) => planTravels(trips, 900, 999, ts("07:00"))[0]?.trains.map((t: any) => t.trainNumber)

    // The five-minute change gets there only five minutes later — not worth a
    // connection you can miss, so the safe one wins.
    const marginal = table(
      first,
      trip("tight", 20, [[3600, "08:34", 1], [999, "09:00", 1]]), // 4 min
      trip("safe", 30, [[3600, "08:35", 1], [999, "09:05", 1]]), // 5 min
    )
    expect(numbers(marginal)).toEqual([10, 30])

    // Same tight change, but now the safe alternative lands 40 minutes later.
    const worthIt = table(
      first,
      trip("tight", 20, [[3600, "08:34", 1], [999, "09:00", 1]]),
      trip("safe", 30, [[3600, "08:35", 1], [999, "09:40", 1]]),
    )
    expect(numbers(worthIt)).toEqual([10, 20])

    // And when it is the only connection there is, it is offered.
    const onlyOption = table(first, trip("tight", 20, [[3600, "08:34", 1], [999, "09:00", 1]]))
    expect(numbers(onlyOption)).toEqual([10, 20])
  })

  it("accepts a long wait when nothing shorter connects, and drops it when something does", () => {
    // A 55-min wait is long but under the ceiling, and it is the only way through.
    const onlyOption = table(
      trip("a", 200, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      trip("b", 201, [[2300, "09:35", 5], [1300, "10:05", 1]]), // 55 min later
    )
    expect(planTravels(onlyOption, 3700, 1300, ts("07:00"))[0].trains.map((t: any) => t.trainNumber)).toEqual([200, 201])

    // Add a connection that arrives sooner and the long layover is not offered.
    const hasShorter = table(
      trip("a", 200, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      trip("b", 201, [[2300, "09:35", 5], [1300, "10:05", 1]]),
      trip("c", 202, [[2300, "09:00", 5], [1300, "09:40", 1]]), // 20-min change
    )
    expect(planTravels(hasShorter, 3700, 1300, ts("07:00"))[0].trains.map((t: any) => t.trainNumber)).toEqual([200, 202])
  })

  it("rejects a transfer that requires waiting more than an hour", () => {
    const trips = table(
      trip("a", 200, [[3700, "08:00", 1], [2300, "08:40", 2]]),
      // only onward train departs 80 min after arrival -> over the 70-min cap -> dropped
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

  it("lists a route a later departure beats only narrowly, dropping it with hideSlowTrains", () => {
    // Real case: Hod HaSharon -> Savidor. The 20:58 change lands 21:41, four
    // minutes after the 21:02 direct gets in — still a real option, so it stays.
    const trips = table(
      trip("legA", 1, [[3700, "04:51", 1], [3500, "05:20", 2]]),
      trip("legB", 2, [[3500, "05:30", 5], [3400, "05:46", 1]]), // arrives 05:46
      trip("fast", 3, [[3700, "04:55", 1], [3400, "05:42", 1]]), // direct, arrives 05:42
    )
    const first = (travels: any[]) => travels.map((t) => t.trains[0].trainNumber)
    expect(first(planTravels(trips, 3700, 3400, ts("03:00")))).toEqual([1, 3])
    const hidden = planTravels(trips, 3700, 3400, ts("03:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(first(hidden)).toEqual([3])
  })

  it("never rides to another station to board a train that calls at the origin", () => {
    // Real case: TLV HaShalom -> Atlit. Riding one stop to Savidor to catch train
    // 154 is pointless — 154 stops at HaShalom four minutes later. Only the plain
    // boarding is offered, not the eight ways of meeting the same train.
    const trips = table(
      trip("hop", 306, [[4600, "07:05", 1], [3700, "07:08", 2]]),
      trip("main", 154, [[4600, "07:21", 3], [3700, "07:28", 1], [2500, "08:14", 2]]),
    )
    const travels = planTravels(trips, 4600, 2500, ts("06:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[154]])
  })

  it("also refuses to ride backwards to meet a train that passes the origin", () => {
    // Real case: TLV HaShalom -> HaHagana. Riding north to Savidor to catch the
    // southbound 21 is pointless — it calls at HaShalom three minutes later and
    // reaches HaHagana at the same 07:20 either way.
    const trips = table(
      trip("north", 306, [[4600, "07:05", 1], [3700, "07:08", 2]]),
      trip("south", 21, [[3700, "07:12", 3], [4600, "07:15", 1], [4900, "07:20", 2]]),
    )
    const travels = planTravels(trips, 4600, 4900, ts("06:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[21]])
  })

  it("refuses that ride even when the train comes back past the origin after midnight", () => {
    // Real case: Hadera West -> Kiryat Motzkin, last departure of the night.
    // Riding south to Netanya at 23:56 to meet train 7224 is pointless — it calls
    // at Hadera West itself at 00:21 and reaches Binyamina at the same 00:32. The
    // call falls past the end of the listed day, so it is never a first train
    // here, but the plain boarding still heads the next day's page.
    const trips = table(
      trip("out", 7227, [[3100, "23:56", 1], [3300, "24:05", 2]]),
      trip("back", 7224, [[3300, "24:12", 1], [3100, "24:21", 2], [2800, "24:32", 3]]),
      trip("early", 7222, [[3100, "23:21", 1], [2800, "23:32", 2]]),
      trip("north", 7156, [[2800, "23:40", 3], [1400, "24:32", 1]]),
      trip("late", 7158, [[2800, "24:40", 3], [1400, "25:32", 1]]),
    )
    const travels = planTravels(trips, 3100, 1400, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[7222, 7156]])
  })

  it("refuses that ride when only the optimised change takes the train past the origin", () => {
    // The rule is applied after the change has been placed. Seeded at 23:52 the
    // journey changes at 3300, ahead of the origin on train 289's run; moving the
    // change to the roomier 2800 carries that leg back through 3100 at 00:21, and
    // only then is the detour visible.
    const trips = table(
      trip("out", 900, [[3100, "23:52", 1], [3310, "24:00", 2]]),
      trip("back", 289, [[3310, "24:10", 1], [3300, "24:20", 2], [3100, "24:21", 3], [2800, "24:35", 1]]),
      trip("on", 950, [[3300, "24:30", 2], [2800, "24:50", 3], [1400, "25:30", 1]]),
      trip("early", 902, [[3100, "23:10", 1], [1400, "24:40", 2]]),
    )
    const travels = planTravels(trips, 3100, 1400, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[902]])
  })

  it("drops an all-night ride round the country even when it is the only option", () => {
    // Real case: Jerusalem -> Pa'ate Modi'in, half an hour's trip, on a Saturday
    // night when nothing else runs. Out to the airport at 23:36, north to Ako,
    // then back down to Modi'in at 05:54 — 263km of straight lines for a 26km
    // journey, and the only listing there was, which is why nothing else can be
    // relied on to displace it. The morning is on the next page.
    const trips = table(
      trip("toAirport", 7724, [[680, "23:36", 3], [8600, "23:56", 2]]),
      trip("north", 7002, [[8600, "24:12", 2], [1500, "25:57", 1]]),
      trip("south", 5, [[1500, "26:58", 2], [400, "29:06", 1]]),
      trip("last", 152, [[400, "29:48", 1], [300, "29:54", 2]]),
    )
    expect(planTravels(trips, 680, 300, ts("00:00"), ts("24:00"))).toEqual([])
  })

  it("keeps the long way round when it is not also an all-night ride", () => {
    // Both halves of that rule are needed. Lod -> Ramla is 2km apart with no late
    // service between them, so the last train of the night goes 31km around by way
    // of HaHagana — fifteen times the straight line, and still only 35 minutes.
    // Distance alone is not what makes a journey the wrong answer.
    const trips = table(
      trip("out", 200, [[5000, "23:42", 1], [4900, "23:58", 2]]),
      trip("back", 202, [[4900, "24:05", 2], [5010, "24:17", 1]]),
    )
    const travels = planTravels(trips, 5000, 5010, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[200, 202]])
  })

  it("drops a journey that spends an hour and a half of it waiting", () => {
    // Real case: Jerusalem -> Pa'ate Modi'in, a seventeen-minute trip. The 03:32
    // waits 54 minutes at the airport and 42 more at Modi'in-Center to get in at
    // 05:54; the 04:32 does the same trip with 54 minutes of waiting in all and
    // lands at 06:13. Setting out an hour later to arrive nineteen minutes later
    // gives the rider back forty-one minutes of the night.
    const trips = table(
      trip("early1", 706, [[680, "03:32", 3], [8600, "03:53", 2]]),
      trip("early2", 5, [[8600, "04:47", 2], [400, "05:06", 1]]),
      trip("early3", 152, [[400, "05:48", 1], [300, "05:54", 2]]),
      trip("late1", 708, [[680, "04:32", 3], [8600, "04:53", 2]]),
      trip("late2", 7, [[8600, "05:42", 2], [400, "06:01", 1]]),
      trip("late3", 543, [[400, "06:06", 1], [300, "06:13", 2]]),
    )
    const travels = planTravels(trips, 680, 300, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[708, 7, 543]])
  })

  it("keeps a long wait when it is the last way to make the trip", () => {
    // Bet Shemesh -> Karmiel: the last train north waits an hour at HaHagana and
    // forty minutes more at Haifa Center. Nothing leaves after it, so there is
    // nothing to give the rider back and it stays.
    const trips = table(
      trip("a", 48, [[7300, "19:48", 1], [4900, "20:05", 2]]),
      trip("b", 180, [[4900, "21:05", 2], [2100, "22:20", 3]]),
      trip("c", 472, [[2100, "23:00", 3], [1840, "23:45", 1]]),
    )
    const travels = planTravels(trips, 7300, 1840, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[48, 180, 472]])
  })

  it("keeps a long wait when waiting it out costs the rider hours", () => {
    // Yokne'am -> Modi'in-Center: 98 minutes of the night spent on platforms to
    // get in at 05:06, which is grim — but the next way to make that trip lands at
    // 08:14, and three hours is the rider's call rather than ours. Half an hour is
    // the whole of what this rule may cost anyone.
    const trips = table(
      trip("n1", 7067, [[1240, "00:16", 1], [2100, "00:34", 2]]),
      trip("n2", 7158, [[2100, "01:12", 2], [1600, "01:51", 1]]),
      trip("n3", 5, [[1600, "02:51", 1], [400, "05:06", 2]]),
      trip("m1", 59, [[1240, "06:01", 1], [2100, "06:18", 2]]),
      trip("m2", 103, [[2100, "06:25", 2], [400, "08:14", 1]]),
    )
    const travels = planTravels(trips, 1240, 400, ts("00:00"), ts("24:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([
      [7067, 7158, 5],
      [59, 103],
    ])
  })

  it("drops a change-route a direct train beats by well over the margin", () => {
    // The direct leaves four minutes later and arrives 37 earlier with no change
    // at all — past the point where setting out sooner buys anything.
    const trips = table(
      trip("legA", 1, [[3700, "04:51", 1], [2300, "05:30", 2]]),
      trip("legB", 2, [[2300, "05:40", 5], [3400, "06:19", 1]]), // arrives 06:19
      trip("fast", 3, [[3700, "04:55", 1], [3400, "05:42", 1]]), // direct, arrives 05:42
    )
    expect(planTravels(trips, 3700, 3400, ts("03:00")).map((t: any) => t.trains[0].trainNumber)).toEqual([3])
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

  it("keeps a direct train a faster one beats only narrowly", () => {
    // Ashkelon -> TLV HaShalom. Train 230 (07:00 -> 07:53) is beaten by 622
    // (07:06 -> 07:50), but by three minutes — inside the margin, so both stand.
    const trips = table(
      trip("slow", 230, [[5900, "07:00", 1], [4600, "07:53", 2]]),
      trip("fast", 622, [[5900, "07:06", 1], [4600, "07:50", 3]]),
      trip("next", 232, [[5900, "07:30", 1], [4600, "08:26", 2]]),
    )
    const numbers = (travels: any[]) => travels.map((t) => t.trains[0].trainNumber)
    expect(numbers(planTravels(trips, 5900, 4600, ts("06:00")))).toEqual([230, 622, 232])
    const hidden = planTravels(trips, 5900, 4600, ts("06:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(numbers(hidden)).toEqual([230, 622, 232])
  })

  it("hides a departure a later one overtakes, but only while that later one runs", () => {
    // The 08:08 has nothing to offer against the 08:15: the 08:15 leaves after it
    // and still arrives first. The 08:28 stays — nothing behind it gets in sooner
    // — and so do the off-peak departures, with nothing overtaking them.
    const leg = (id: string, n: number, dep: string, mid: string) => trip(id, n, [[3700, dep, 1], [3500, mid, 2]])
    const onward = (id: string, n: number, dep: string, arr: string) => trip(id, n, [[3500, dep, 3], [3400, arr, 1]])
    const trips = table(
      leg("a1", 801, "08:08", "08:20"), onward("a2", 802, "08:26", "08:40"),
      leg("b1", 811, "08:15", "08:19"), onward("b2", 812, "08:24", "08:30"),
      leg("c1", 821, "08:28", "08:40"), onward("c2", 822, "08:46", "09:00"),
      leg("d1", 1001, "10:08", "10:20"), onward("d2", 1002, "10:26", "10:40"),
      leg("e1", 1101, "11:08", "11:20"), onward("e2", 1102, "11:26", "11:40"),
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t: any) => t.departureTime.slice(11, 16))).toEqual(["08:15", "08:28", "10:08", "11:08"])
  })

  it("never hides a direct train, whatever overtakes it", () => {
    // The same shape with single trains: a direct is always a real way to make the
    // trip and is listed however the timetable is arranged around it.
    const trips = table(
      trip("slow", 801, [[3700, "08:08", 1], [3400, "08:40", 1]]),
      trip("fast", 811, [[3700, "08:15", 1], [3400, "08:30", 1]]),
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t: any) => t.departureTime.slice(11, 16))).toEqual(["08:08", "08:15"])
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

  it("never lets a direct train hide a competitive itinerary with changes", () => {
    const trips = table(
      trip("legA", 1, [[3700, "04:51", 1], [3500, "05:20", 2]]), // 1-change leg 1…
      trip("legB", 2, [[3500, "05:30", 5], [3400, "05:46", 1]]), // …arrives 05:46
      trip("fast", 3, [[3700, "04:55", 1], [3400, "05:42", 1]]), // direct, arrives 05:42
    )
    const travels = planTravels(trips, 3700, 3400, ts("03:00"), Infinity, undefined, { hideSlowTrains: false })
    // Explicitly off: the direct arriving 4 min sooner takes nothing off the list.
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[1, 2], [3]])
  })

  it("lists both trains that arrive together, collapsing them only with hideSlowTrains", () => {
    // Real case: TLV HaShalom -> Savidor, where several trains a few minutes apart
    // land on the same minute. Both are boardable, so both have to be listed.
    const trips = table(
      trip("a", 100, [[3700, "08:00", 1], [3400, "09:00", 1]]),
      trip("b", 101, [[3700, "08:30", 1], [3400, "09:00", 1]]), // same arrival, later departure
    )
    const first = (travels: any[]) => travels.map((t) => t.trains[0].trainNumber)
    expect(first(planTravels(trips, 3700, 3400, ts("07:00")))).toEqual([100, 101])
    const hidden = planTravels(trips, 3700, 3400, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(first(hidden)).toEqual([101])
  })

  it("prefers fewer changes when arrival is the same and the penalty is under 20 min", () => {
    const trips = table(
      trip("direct", 100, [[3700, "08:10", 1], [3400, "09:00", 1]]), // direct, 50 min
      trip("legA", 200, [[3700, "08:25", 1], [2300, "08:40", 2]]), // 1-change, 35 min total…
      trip("legB", 201, [[2300, "08:50", 5], [3400, "09:00", 1]]), // …same 09:00 arrival
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
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
    const travels = planTravels(trips, 3700, 3400, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    // direct is 35 min longer than the 25-min 1-change -> keep the shorter (1-change)
    expect(travels).toHaveLength(1)
    expect(travels[0].trains.map((t: any) => t.trainNumber)).toEqual([200, 201])
  })

  it("offers a change off a direct train when it gets there sooner, keeping the direct too", () => {
    const trips = table(
      // 301 reaches 1300 directly at 09:00, but takes the long way round…
      trip("a", 301, [[3700, "08:00", 1], [2300, "08:20", 2], [1300, "09:00", 1]]),
      trip("b", 302, [[2300, "08:30", 5], [1300, "08:45", 1]]), // …changing at 2300 arrives 08:45
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"))
    expect(travels.map((t) => t.trains.map((n: { trainNumber: number }) => n.trainNumber))).toEqual([
      [301, 302], // faster option first
      [301], // the direct train stays listed
    ])
    expect(travels[0].arrivalTime).toBe("2026-06-27T08:45:00")
    expect(travels[1].arrivalTime).toBe("2026-06-27T09:00:00")
  })

  it("hides the direct ride on a train you can change off sooner, with hideSlowTrains", () => {
    const trips = table(
      trip("a", 301, [[3700, "08:00", 1], [2300, "08:20", 2], [1300, "09:00", 1]]),
      trip("b", 302, [[2300, "08:30", 5], [1300, "08:45", 1]]),
    )
    // Same 08:00 boarding either way, so there is no wait to trade against the change.
    const travels = planTravels(trips, 3700, 1300, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t) => t.trains.map((n: { trainNumber: number }) => n.trainNumber))).toEqual([[301, 302]])
  })

  it("keeps a slow direct train when the faster ride on it is not itself listed", () => {
    const trips = table(
      trip("a", 301, [[3700, "08:00", 1], [2300, "08:20", 2], [1300, "09:00", 1]]),
      trip("b", 302, [[2300, "08:30", 5], [1300, "08:45", 1]]), // change off 301 -> 08:45
      // …but this 08:05 pair arrives 08:40, so the change off 301 is dropped and the
      // slow direct is the only thing left on the 08:00 train — it has to stay.
      trip("c", 304, [[3700, "08:05", 1], [2400, "08:15", 2]]),
      trip("d", 305, [[2400, "08:25", 3], [1300, "08:40", 1]]),
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"), Infinity, undefined, { hideSlowTrains: true })
    expect(travels.map((t) => t.trains.map((n: { trainNumber: number }) => n.trainNumber))).toEqual([[301], [304, 305]])
  })

  it("drops a change-route that lands with a later, simpler one", () => {
    // Real case: Kiryat Motzkin -> Tel Aviv University. Riding out to Ako at 21:20
    // to wait for train 135 arrives 23:28 — exactly when 135 gets there having
    // picked you up at Kiryat Motzkin at 22:04. Setting out 44 minutes earlier and
    // changing once more buys nothing at all.
    const trips = table(
      trip("out", 128, [[1400, "21:20", 1], [1500, "21:29", 2]]),
      trip("main", 135, [[1500, "21:53", 3], [1400, "22:04", 1], [3600, "23:28", 2]]),
    )
    const travels = planTravels(trips, 1400, 3600, ts("20:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[135]])
  })

  it("keeps a change-route that lands at the same time but leaves later", () => {
    // The mirror case: the change-route departs after the direct, so it is not the
    // one giving something up — both stay listed.
    const trips = table(
      trip("direct", 100, [[3700, "08:00", 1], [3400, "09:00", 1]]),
      trip("legA", 200, [[3700, "08:20", 1], [2300, "08:35", 2]]),
      trip("legB", 201, [[2300, "08:45", 5], [3400, "09:00", 1]]),
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[100], [200, 201]])
  })

  it("drops a route another beats outright by a quarter of an hour", () => {
    // Real case: Netanya-Sapir -> Holon-Wolfson. The 06:26 takes three changes to
    // arrive 07:38; the 06:32 takes two and arrives 07:23. Later out, sooner in,
    // one change fewer — the first gives up real time for nothing.
    const trips = table(
      trip("a1", 222, [[3310, "06:26", 1], [3300, "06:31", 2]]),
      trip("a2", 957, [[3300, "06:50", 1], [3600, "07:11", 2]]),
      trip("a3", 305, [[3600, "07:17", 1], [4660, "07:38", 2]]),
      trip("b1", 223, [[3310, "06:32", 1], [3600, "06:49", 2]]),
      trip("b2", 617, [[3600, "07:02", 1], [4660, "07:23", 2]]),
    )
    const travels = planTravels(trips, 3310, 4660, ts("05:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[223, 617]])
  })

  it("keeps a route beaten only narrowly, even on every axis", () => {
    // Same shape but the margin is four minutes, not fifteen: leaving a little
    // earlier to arrive a little later is a trade worth offering.
    const trips = table(
      trip("legA", 1, [[3700, "20:58", 1], [3500, "21:11", 2]]),
      trip("legB", 2, [[3500, "21:29", 5], [3400, "21:41", 1]]),
      trip("direct", 3, [[3700, "21:02", 1], [3400, "21:37", 1]]),
    )
    const travels = planTravels(trips, 3700, 3400, ts("20:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[1, 2], [3]])
  })

  it("drops a covered route that doubles back past the destination", () => {
    // Real case: Hadera-West -> Tel Aviv University. Changing at Binyamina means
    // riding north, away from Tel Aviv, to come back down — and the direct four
    // minutes later gets there sooner anyway.
    const trips = table(
      trip("north", 12, [[3100, "05:43", 1], [2800, "05:52", 2]]),
      trip("back", 101, [[2800, "05:56", 3], [3600, "06:24", 1]]),
      trip("direct", 221, [[3100, "05:47", 1], [3600, "06:19", 2]]),
    )
    const travels = planTravels(trips, 3100, 3600, ts("05:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[221]])
  })

  it("keeps a change that is genuinely on the way", () => {
    // Netivot -> Herzliya through Tel Aviv is not a detour: Tel Aviv is nearer
    // Herzliya than Netivot is, so the change is progress even though it is slower.
    const trips = table(
      trip("legA", 638, [[9650, "10:43", 1], [3700, "12:13", 2]]),
      trip("legB", 512, [[3700, "12:20", 3], [3500, "12:41", 1]]),
      trip("direct", 640, [[9650, "10:47", 1], [3500, "12:38", 2]]), // 3 min sooner, inside the margin
    )
    const travels = planTravels(trips, 9650, 3500, ts("10:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[638, 512], [640]])
  })

  it("drops a route whose alternative gives back ten minutes of the day", () => {
    // Real case: waiting 27 minutes to arrive 4 minutes sooner is 31 minutes spent
    // on nothing, so the earlier departure is not a choice anybody makes — even
    // though it lands only 4 minutes behind, inside the arrival margin.
    const trips = table(
      trip("slowA", 303, [[2940, "06:08", 1], [4900, "07:00", 2]]),
      trip("slowB", 223, [[4900, "07:05", 5], [5000, "07:23", 1]]), // arrives 07:23
      trip("quick", 300, [[2940, "06:35", 1], [5000, "07:19", 2]]), // 27 min later, 4 min sooner
    )
    const travels = planTravels(trips, 2940, 5000, ts("05:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[300]])
  })

  it("keeps a small trade of waiting against arrival", () => {
    // Two minutes of waiting for two minutes of arrival is a real preference —
    // there are reasons to pick a train beyond when it lands.
    const trips = table(
      trip("legA", 269, [[5000, "18:49", 1], [5800, "19:20", 2]]),
      trip("legB", 672, [[5800, "19:28", 5], [9000, "19:44", 1]]), // arrives 19:44
      trip("other", 46, [[5000, "18:51", 1], [4900, "19:05", 2]]),
      trip("onward", 665, [[4900, "19:15", 3], [9000, "19:43", 1]]), // 2 min later, 1 min sooner
    )
    const travels = planTravels(trips, 5000, 9000, ts("18:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[269, 672], [46, 665]])
  })

  it("caps changes at one more than the quickest way to make the trip", () => {
    // A direct train exists, so a two-change itinerary is past what the trip is
    // worth — however it is timed. One change stays.
    const trips = table(
      trip("fast", 100, [[3700, "09:00", 1], [3400, "09:30", 1]]), // direct, the quickest
      trip("oneA", 200, [[3700, "08:40", 1], [3500, "08:50", 2]]), // 1 change…
      trip("oneB", 201, [[3500, "08:58", 5], [3400, "09:28", 1]]), // …arrives 09:28
      trip("twoA", 300, [[3700, "08:00", 1], [3500, "08:10", 2]]), // 2 changes…
      trip("twoB", 301, [[3500, "08:20", 5], [3600, "08:30", 1]]),
      trip("twoC", 302, [[3600, "08:40", 3], [3400, "09:32", 1]]), // …arrives 09:32, last of the three
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t: any) => t.trains.length - 1)).toEqual([1, 0])
  })

  it("keeps the deeper itinerary when the trip genuinely needs it", () => {
    // Nothing simpler reaches the destination, so the cap follows the timetable.
    const trips = table(
      trip("a", 300, [[3700, "08:00", 1], [3500, "08:10", 2]]),
      trip("b", 301, [[3500, "08:20", 5], [3600, "08:30", 1]]),
      trip("c", 302, [[3600, "08:40", 3], [3400, "09:26", 1]]),
    )
    const travels = planTravels(trips, 3700, 3400, ts("07:00"))
    expect(travels.map((t: any) => t.trains.map((x: any) => x.trainNumber))).toEqual([[300, 301, 302]])
  })

  it("does not split a direct train into a transfer that saves nothing", () => {
    const trips = table(
      trip("a", 301, [[3700, "08:00", 1], [2300, "08:20", 2], [1300, "09:00", 1]]),
      trip("b", 302, [[2300, "08:30", 5], [1300, "09:05", 1]]), // changing arrives later
    )
    const travels = planTravels(trips, 3700, 1300, ts("07:00"))
    expect(travels.map((t) => t.trains.map((n: { trainNumber: number }) => n.trainNumber))).toEqual([[301]])
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
        // shared TLV stations, all 5 min — at the floor, and still "tight": University, Savidor, HaShalom
        trip("f1", 10, [[900, "08:00", 1], [3600, "08:30", 1], [3700, "08:33", 1], [4600, "08:36", 1]]),
        trip("f2", 20, [[3600, "08:35", 1], [3700, "08:38", 1], [4600, "08:41", 1], [999, "09:00", 1]]),
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
        // neither shared station is one of the big interchanges, so only timing decides
        trip("f1", 10, [[900, "08:00", 1], [2300, "08:30", 1], [2200, "08:40", 1]]),
        trip("f2", 20, [[2300, "08:42", 1], [2200, "08:52", 1], [999, "09:30", 1]]), // both ~12m
      )
      const travels = planTravels(trips, 900, 999, ts("07:00"))
      expect(changeStation(travels)).toBe(2300) // earliest shared station
    })

    it("changes at Haifa Center rather than Tel Aviv when both are on the way", () => {
      // Real case: Be'er Sheva -> Kiryat Motzkin. Same trains and the same arrival
      // either way; Haifa Center is the easier place to be standing.
      const trips = table(
        trip("f1", 10, [[900, "08:00", 1], [4900, "08:30", 1], [2100, "09:30", 1]]),
        trip("f2", 20, [[4900, "08:45", 1], [2100, "09:45", 1], [1400, "10:10", 1]]),
      )
      const travels = planTravels(trips, 900, 1400, ts("07:00"))
      expect(changeStation(travels)).toBe(2100)
      expect(travels[0].arrivalTime).toBe("2026-06-27T10:10:00") // arrival unchanged
    })

    it("still refuses a tight change at an interchange when a roomier one exists", () => {
      // Comfort never costs a connection you might miss: Haifa Center is 4 minutes
      // here, so the roomier Tel Aviv change wins.
      const trips = table(
        trip("f1", 10, [[900, "08:00", 1], [4900, "08:30", 1], [2100, "09:30", 1]]),
        trip("f2", 20, [[4900, "08:50", 1], [2100, "09:34", 1], [1400, "10:10", 1]]),
      )
      const travels = planTravels(trips, 900, 1400, ts("07:00"))
      expect(changeStation(travels)).toBe(4900)
    })
  })
})
