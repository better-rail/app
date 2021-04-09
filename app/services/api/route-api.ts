import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { stationsObject } from "../../data/stations"
import { RailApiGetRoutesResult } from "./api.types"

export class RouteApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async getRoutes(originId: string, destinationId: string, date: string, hour: string) {
    try {
      const response: ApiResponse<RailApiGetRoutesResult> = await this.api.apisauce.get(
        `/GetRoutes?OId=${originId}&TId=${destinationId}&Date=${date}&Hour=${hour}`,
      )
      console.log(response)

      if (response.data.MessageType === 1) {
        // TODO: Handle API errors
      }

      const formattedRoutes = response.data.Data.Routes.map((route) => {
        const { Train, IsExchange, EstTime } = route

        const trains = Train.map((train) => {
          const { DepartureTime, ArrivalTime, StopStations, OrignStation, DestinationStation } = train

          const stopStations = StopStations.map((station) => {
            const { StationId: stationId, ArrivalTime: arrivalTime, DepartureTime: departureTime, Platform: platform } = station
            const stationName = stationsObject[stationId].hebrew
            return { stationId, stationName, arrivalTime, departureTime, platform }
          })

          return {
            originStationId: OrignStation,
            destinationStationId: DestinationStation,
            departureTime: DepartureTime,
            arrivalTime: ArrivalTime,
            stopStations,
          }
        })

        return { isExchange: IsExchange, estTime: EstTime, trains }
      })

      return formattedRoutes
    } catch (err) {
      console.error(err)
    }
  }
}
