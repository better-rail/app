import { Ride } from "../../types/ride"
import { minutesInMs } from "../helpers/utils"
import { partiallyMock } from "../helpers/types"
import { LanguageCode } from "../../locales/i18n"
import { Provider } from "../../types/notification"
import { RouteItem, Station } from "../../types/rail"

export const now = Date.now()
export const directDuration = minutesInMs(10)
export const exchangeDuration = minutesInMs(25)
export const getOffInExchangeTime = minutesInMs(10)

export const stations = partiallyMock<Station[]>([
  {
    id: "10",
    english: "Netanya",
  },
  {
    id: "20",
    english: "Herzliya",
  },
  {
    id: "30",
    english: "Tel Aviv - Savidor Center",
  },
  {
    id: "40",
    english: "Ashkelon",
  },
  {
    id: "50",
    english: "Ben Gurion Airport",
  },
  {
    id: "60",
    english: "Jerusalem - Yitzhak Navon",
  },
])

export const ride = partiallyMock<Ride>({
  token: "test",
  locale: LanguageCode.en,
  provider: Provider.ios,
})

export const directRoute = partiallyMock<RouteItem>({
  delay: 0,
  isExchange: false,
  duration: directDuration,
  departureTime: now,
  arrivalTime: now + directDuration,
  trains: [
    {
      trainNumber: 666,
      departureTime: now,
      delay: 2,
      originStationId: 10,
      lastStop: "Ashkelon",
      originPlatform: 6,
      arrivalTime: now + directDuration,
      destinationStationId: 30,
      destinationStationName: "Tel Aviv - Savidor Center",
      stopStations: [
        {
          stationId: 20,
          departureTime: now + minutesInMs(5),
        },
      ],
    },
  ],
})

export const exchangeRoute = partiallyMock<RouteItem>({
  delay: 0,
  isExchange: true,
  duration: exchangeDuration,
  departureTime: now,
  arrivalTime: now + exchangeDuration,
  trains: [
    {
      trainNumber: 777,
      departureTime: now,
      delay: 2,
      originStationId: 10,
      lastStop: "Ashkelon",
      originPlatform: 6,
      arrivalTime: now + minutesInMs(10),
      destinationStationId: 30,
      destinationStationName: "Tel Aviv - Savidor Center",
      stopStations: [
        {
          stationId: 20,
          departureTime: now + minutesInMs(5),
        },
      ],
    },
    {
      trainNumber: 888,
      departureTime: now + minutesInMs(15),
      delay: 4,
      originStationId: 30,
      lastStop: "Jerusalem - Yitzhak Navon",
      originPlatform: 4,
      arrivalTime: now + exchangeDuration,
      destinationStationId: 60,
      destinationStationName: "Jerusalem - Yitzhak Navon",
      stopStations: [
        {
          stationId: 50,
          departureTime: now + minutesInMs(20),
        },
      ],
    },
  ],
})
