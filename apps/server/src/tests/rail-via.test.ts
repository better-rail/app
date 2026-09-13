import { stitchViaTravels } from "../requests/rail-via"
import type { RailApiRouteItem, StopStation, Train } from "../types/rail-response"

const DATE = "2026-09-14"
const NAHARIYA = 1600
const BINYAMINA = 2300
const SAVIDOR = 3700
const JERUSALEM = 680

const train = (
  trainNumber: number,
  from: number,
  to: number,
  departure: string,
  arrival: string,
  [originPlatform, destPlatform] = [1, 1],
): Train => ({
  trainNumber,
  orignStation: from,
  destinationStation: to,
  originPlatform,
  destPlatform,
  freeSeats: 100,
  departureTime: `${DATE}T${departure}:00`,
  arrivalTime: `${DATE}T${arrival}:00`,
  stopStations: [],
  handicap: 0,
  crowded: 0,
  trainPosition: null,
  routeStations: [],
})

const travel = (...trains: Train[]): RailApiRouteItem => ({
  departureTime: trains[0].departureTime,
  arrivalTime: trains[trains.length - 1].arrivalTime,
  freeSeats: 100,
  travelMessages: [],
  trains,
})

const stop = (stationId: number, time: string): StopStation => ({
  stationId,
  arrivalTime: `${DATE}T${time}:00`,
  departureTime: `${DATE}T${time}:00`,
  platform: 1,
  crowded: 0,
})

const trainNumbers = (journey: RailApiRouteItem) => journey.trains.map((t) => t.trainNumber)

describe("stitchViaTravels", () => {
  test("joins each journey to the station with the onward journey that gets in first", () => {
    const toVia = [travel(train(157, NAHARIYA, SAVIDOR, "08:15", "10:01", [2, 3]))]
    const onward = [
      travel(train(501, SAVIDOR, JERUSALEM, "10:04", "10:40")), // a three-minute change is too short
      travel(train(503, SAVIDOR, JERUSALEM, "10:08", "10:52")),
      travel(train(505, SAVIDOR, JERUSALEM, "10:12", "10:47")),
    ]

    const joined = stitchViaTravels(toVia, onward)
    expect(joined).toHaveLength(1)
    expect(trainNumbers(joined[0])).toEqual([157, 505])
    expect(joined[0].departureTime).toBe(`${DATE}T08:15:00`)
    expect(joined[0].arrivalTime).toBe(`${DATE}T10:47:00`)
  })

  test("allows a four-minute change on the same platform", () => {
    const toVia = [travel(train(157, NAHARIYA, SAVIDOR, "08:15", "10:01", [2, 3]))]
    const onward = [travel(train(501, SAVIDOR, JERUSALEM, "10:05", "10:40", [3, 1]))]

    expect(trainNumbers(stitchViaTravels(toVia, onward)[0])).toEqual([157, 501])
  })

  test("allows a four-minute change across a Savidor island", () => {
    const toVia = [travel(train(157, NAHARIYA, SAVIDOR, "08:15", "10:01", [2, 1]))]
    const onward = [travel(train(501, SAVIDOR, JERUSALEM, "10:05", "10:40", [2, 1]))]

    expect(trainNumbers(stitchViaTravels(toVia, onward)[0])).toEqual([157, 501])
  })

  test("keeps a train running straight through the station as one train", () => {
    const toVia = [travel({ ...train(157, NAHARIYA, SAVIDOR, "08:15", "10:01", [2, 3]), stopStations: [stop(BINYAMINA, "09:26")] })]
    const onward = [
      travel(train(157, SAVIDOR, JERUSALEM, "10:03", "10:50", [3, 1])),
      travel(train(505, SAVIDOR, JERUSALEM, "10:12", "10:55")),
    ]

    const [joined] = stitchViaTravels(toVia, onward)
    expect(trainNumbers(joined)).toEqual([157])
    expect(joined.trains[0]).toMatchObject({ orignStation: NAHARIYA, destinationStation: JERUSALEM, arrivalTime: `${DATE}T10:50:00` })
    expect(joined.trains[0].stopStations.map((s) => s.stationId)).toEqual([BINYAMINA, SAVIDOR])
  })

  test("drops a journey with no onward train inside the connection window", () => {
    const toVia = [travel(train(157, NAHARIYA, SAVIDOR, "08:15", "10:01"))]
    const onward = [travel(train(501, SAVIDOR, JERUSALEM, "11:30", "12:10"))]

    expect(stitchViaTravels(toVia, onward)).toEqual([])
  })

  test("lists journeys by departure, direct ones first", () => {
    const direct = travel(train(157, NAHARIYA, SAVIDOR, "08:15", "10:01"))
    const withChange = travel(train(101, NAHARIYA, BINYAMINA, "08:15", "08:40"), train(201, BINYAMINA, SAVIDOR, "08:50", "10:05"))
    const earlier = travel(train(155, NAHARIYA, SAVIDOR, "07:15", "09:01"))
    const onward = [
      travel(train(501, SAVIDOR, JERUSALEM, "10:12", "10:47")),
      travel(train(499, SAVIDOR, JERUSALEM, "09:12", "09:47")),
    ]

    const joined = stitchViaTravels([withChange, direct, earlier], onward)
    expect(joined.map((journey) => journey.trains[0].trainNumber)).toEqual([155, 157, 101])
  })
})
