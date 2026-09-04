import type { RouteItem, Train } from "@/services/api"

export const MINUTE = 60 * 1000

/**
 * A two-leg route with an exchange at station 2:
 * train 100: 1 -> (10, 11) -> 2
 * train 200: 2 -> (20) -> 3
 *
 * @param departureOffset milliseconds from now the route departs - pass a negative value for a route in progress
 */
export const buildRoute = (departureOffset: number): RouteItem => {
  const departureTime = Date.now() + departureOffset

  const firstTrain = {
    trainNumber: 100,
    originStationId: 1,
    destinationStationId: 2,
    departureTime,
    arrivalTime: departureTime + 30 * MINUTE,
    stopStations: [
      { stationId: 10, departureTime: departureTime + 10 * MINUTE },
      { stationId: 11, departureTime: departureTime + 20 * MINUTE },
    ],
    delay: 0,
  } as Train

  const secondTrain = {
    trainNumber: 200,
    originStationId: 2,
    destinationStationId: 3,
    destinationStationName: "Tel Aviv - Savidor Center",
    departureTime: departureTime + 40 * MINUTE,
    arrivalTime: departureTime + 60 * MINUTE,
    stopStations: [{ stationId: 20, departureTime: departureTime + 50 * MINUTE }],
    delay: 0,
  } as Train

  return { trains: [firstTrain, secondTrain] } as RouteItem
}
