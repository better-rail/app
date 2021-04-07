import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { GetCharactersResult } from "./api.types"
import { getGeneralApiProblem } from "./api-problem"

export class RouteApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async getRoutes(originId: string, destId: string, date: string, hour: string) {
    const response = await this.api.apisauce.get(`/GetRoutes?OId=680&TId=3700&Date=20210407&Hour=1830`)
    if (response.data.messageType === 1) {
      // TODO: Handle API errors
    }

    const formattedRoutes = response.data.Data.Routes.map((route) => {
      const { Train, IsExchange, EstTime } = route
      const { DepartureTime, ArrivalTime, StopStations } = Train[0]

      const stopStations = StopStations.map((station) => {
        const { StationId: stationId, ArrivalTime: arrivalTime, DepartureTime: departureTime, Platform: platform } = station
        return { stationId, arrivalTime, departureTime, platform }
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

  async getCharacters(): Promise<GetCharactersResult> {
    try {
      // make the api call
      const response: ApiResponse<any> = await this.api.apisauce.get(
        "https://raw.githubusercontent.com/infinitered/ignite/master/data/rick-and-morty.json",
        { amount: API_PAGE_SIZE },
      )

      // the typical ways to die when calling an api
      if (!response.ok) {
        const problem = getGeneralApiProblem(response)
        if (problem) return problem
      }

      const characters = response.data.results

      return { kind: "ok", characters }
    } catch (e) {
      __DEV__ && console.tron.log(e.message)
      return { kind: "bad-data" }
    }
  }
}
