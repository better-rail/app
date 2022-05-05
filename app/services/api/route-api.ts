import { ApiResponse } from "apisauce"
import { Api } from "./api"
import { stationsObject, stationLocale } from "../../data/stations"
import { RailApiGetRoutesResult } from "./api.types"
import { parseApiDate } from "../../utils/helpers/date-helpers"
import { RouteItem } from "."

export class RouteApi {
  private api: Api

  constructor(api: Api) {
    this.api = api
  }

  async getRoutes(originId: string, destinationId: string, date: string, hour: string): Promise<RouteItem[]> {
    if (!originId || !destinationId) throw new Error("Missing origin / destination data")

    try {
      const response: ApiResponse<RailApiGetRoutesResult> = await this.api.apisauce.get(
        `/apiinfo/api/Plan/GetRoutes?OId=${originId}&TId=${destinationId}&Date=${date}&Hour=${hour}`,
      )

      if (response.data.MessageType === 1) {
        // TODO: Handle API errors
      }

      const { Data: responseData } = response.data

      if (responseData.Error !== null) throw new Error(responseData.Error.Description)

      const delays = responseData.Delays.reduce((delaysObject, delayItem) => {
        return Object.assign({}, delaysObject, { [delayItem.Train]: parseInt(delayItem.Min) })
      }, {})

      const crowdDetails = responseData.Omasim

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

          // The last stop is fetched from the "crowded" details
          const trainCrowdDetail = crowdDetails.find((detail) => detail.TrainNumber === Number(Trainno))
          const lastStationId = trainCrowdDetail.Stations[trainCrowdDetail.Stations.length - 1].StationNumber
          // console.log(lastStationId)

          const route = {
            delay: delays[Trainno] || 0,
            originStationId: OrignStation,
            originStationName: stationsObject[OrignStation][stationLocale],
            destinationStationId: DestinationStation,
            destinationStationName: stationsObject[DestinationStation][stationLocale],
            departureTime: parseApiDate(DepartureTime),
            arrivalTime: parseApiDate(ArrivalTime),
            originPlatform: Platform,
            destinationPlatform: DestPlatform,
            lastStop: stationsObject[lastStationId][stationLocale],
            trainNumber: Trainno,
            stopStations,
          }

          return route
        })

        return {
          departureTime: parseApiDate(responseData.Details.Date),
          isExchange: IsExchange,
          estTime: EstTime,
          delay: trains[0].delay,
          trains,
        }
      })

      return formattedRoutes
    } catch (err) {
      console.error(err)
    }
  }
}
