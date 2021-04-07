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
    const response: ApiResponse<RailApiGetRoutesResult> = await this.api.apisauce.get(
      `/GetRoutes?OId=${originId}&TId=${destinationId}&Date=${date}&Hour=${hour}`,
    )

    if (response.data.MessageType === 1) {
      // TODO: Handle API errors
    }

    const formattedRoutes = response.data.Data.Routes.map((route) => {
      const { Train, IsExchange, EstTime } = route
      const { DepartureTime, ArrivalTime, StopStations } = Train[0]

      const stopStations = StopStations.map((station) => {
        const { StationId: stationId, ArrivalTime: arrivalTime, DepartureTime: departureTime, Platform: platform } = station
        const stationName = stationsObject[stationId].hebrew
        return { stationId, stationName, arrivalTime, departureTime, platform }
      })

      return {
        isExchange: IsExchange,
        estTime: EstTime,
        departureTime: DepartureTime,
        arrivalTime: ArrivalTime,
        stopStations,
      }
    })

    return formattedRoutes
  }
}
