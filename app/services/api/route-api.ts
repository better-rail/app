import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { GetCharactersResult } from "./api.types"
import { getGeneralApiProblem } from "./api-problem"

export class RouteApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async getRoute(originId: string, destId: string, date: string, hour: string) {
    const response = await this.api.apisauce.get(`/GetRoutes?OId=680&TId=3700&Date=20210405&Hour=1830`)
    return response.data.routes
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
