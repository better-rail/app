import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withEnvironment } from "../extensions/with-environment"
import { RouteApi } from "../../services/api/route-api"
import { format, add } from "date-fns"

const TrainListSchema = {
  arrivalTime: types.number,
  departureTime: types.number,
  originStationId: types.string,
  originStationName: types.string,
  destinationStationId: types.string,
  destinationStationName: types.string,
  originPlatform: types.string,
  destinationPlatform: types.string,
  trainNumber: types.string,
  stopStations: types.array(
    types.model({
      arrivalTime: types.number,
      departureTime: types.number,
      stationId: types.string,
      stationName: types.string,
      platform: types.string,
    }),
  ),
}

const trainRoutesSchema = {
  departureTime: types.number,
  isExchange: types.boolean,
  estTime: types.string,
  trains: types.array(types.model(TrainListSchema)),
}

/**
 * Model description here for TypeScript hints.
 */
export const trainRoutessModel = types
  .model("trainRoutes")
  .props({
    routes: types.array(types.model(trainRoutesSchema)),
    status: "pending",
    resultType: "normal",
  })
  .extend(withEnvironment)
  .actions((self) => ({
    saveRoutes: (routesSnapshot) => {
      self.routes.replace(routesSnapshot)
    },
    updateStatus(status: "pending" | "loading" | "loaded" | "error") {
      self.status = status
    },
    updateResultType(type: "normal" | "different-date" | "not-found") {
      self.resultType = type
    },
  }))
  .actions((self) => ({
    getRoutes: async (originId: string, destinationId: string, time: number) => {
      self.updateStatus("loading")
      const routeApi = new RouteApi(self.environment.api)

      let foundRoutes = false
      let apiHitCount = 0
      let requestDate = time

      // If no routes are found, try to fetch results for the 3 upcoming days.
      while (!foundRoutes && apiHitCount < 4) {
        // Format times for Israel Rail API
        const date = format(requestDate, "yyyyMMdd")
        const hour = format(time, "HHmm")

        const result = await routeApi.getRoutes(originId, destinationId, date, hour)

        if (result.length > 0) {
          foundRoutes = true
          self.saveRoutes(result)
          self.updateStatus("loaded")

          if (apiHitCount > 0) {
            // We found routes for a date different than the requested date.
            self.updateResultType("different-date")
          }
        } else {
          apiHitCount += 1
          requestDate = add(requestDate, { days: 1 }).getTime()
        }
      }

      if (foundRoutes === false) {
        // We couldn't found routes for the requested date.
        self.updateResultType("not-found")
      }
    },
  }))

type RouteType = Instance<typeof trainRoutessModel>
export interface Route extends RouteType {}
type RouteSnapshotType = SnapshotOut<typeof trainRoutessModel>
export interface RouteSnapshot extends RouteSnapshotType {}
export const createRouteDefaultModel = () => types.optional(trainRoutessModel, {})
