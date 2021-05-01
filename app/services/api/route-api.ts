import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { stationsObject } from "../../data/stations"
import { RailApiGetRoutesResult } from "./api.types"
import { parseApiDate } from "../../utils/helpers/date-helpers"
import { stationLocale } from "../../data/stations"

export class RouteApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async getRoutes(originId: string, destinationId: string, date: string, hour: string) {
    try {
      const response: ApiResponse<RailApiGetRoutesResult> = await this.api.apisauce.get(
        `/apiinfo/api/Plan/GetRoutes?OId=${originId}&TId=${destinationId}&Date=${date}&Hour=${hour}`,
      )

      if (response.data.MessageType === 1) {
        // TODO: Handle API errors
      }

      const { Data: responseData } = response.data

      const formattedRoutes = responseData.Routes.map((route) => {
        const { Train, IsExchange, EstTime } = route

        const trains = Train.map((train) => {
          const {
            DepartureTime,
            ArrivalTime,
            StopStations,
            OrignStation,
            DestinationStation,
            Platform,
            DestPlatform,
            Trainno,
          } = train

          const stopStations = StopStations.map((station) => {
            const { StationId: stationId, Platform: platform, ArrivalTime, DepartureTime } = station
            const stationName = stationsObject[stationId][stationLocale]

            return {
              stationId,
              stationName,
              arrivalTime: parseApiDate(ArrivalTime),
              departureTime: parseApiDate(DepartureTime),
              platform,
            }
          })

          return {
            originStationId: OrignStation,
            originStationName: stationsObject[OrignStation][stationLocale],
            destinationStationId: DestinationStation,
            destinationStationName: stationsObject[DestinationStation][stationLocale],
            departureTime: parseApiDate(DepartureTime),
            arrivalTime: parseApiDate(ArrivalTime),
            originPlatform: Platform,
            destinationPlatform: DestPlatform,
            trainNumber: Trainno,
            stopStations,
          }
        })

        return { departureTime: parseApiDate(responseData.Details.Date), isExchange: IsExchange, estTime: EstTime, trains }
      })

      return formattedRoutes
    } catch (err) {
      console.error(err)
    }
  }
}
