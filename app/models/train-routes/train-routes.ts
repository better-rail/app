import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withEnvironment, withStatus } from ".."
import { RouteApi } from "../../services/api/route-api"
import { format, add } from "date-fns"
import { omit } from "ramda"
import { RouteItem } from "../../services/api"

export const trainStop = {
  arrivalTime: types.number,
  departureTime: types.number,
  stationId: types.string,
  stationName: types.string,
  platform: types.string,
}

export const trainListSchema = {
  delay: types.number,
  arrivalTime: types.number,
  departureTime: types.number,
  originStationId: types.string,
  originStationName: types.string,
  destinationStationId: types.string,
  destinationStationName: types.string,
  originPlatform: types.string,
  destinationPlatform: types.string,
  trainNumber: types.string,
  stopStations: types.array(types.model(trainStop)),
}

export const trainRouteSchema = {
  departureTime: types.number,
  isExchange: types.boolean,
  estTime: types.string,
  trains: types.array(types.model(trainListSchema)),
  delay: types.number,
}

export const trainRoutesModel = types
  .model("trainRoutes")
  .props({
    routes: types.array(types.model(trainRouteSchema)),
    resultType: "normal",
  })
  .extend(withEnvironment)
  .extend(withStatus)
  .actions((self) => ({
    saveRoutes: (routesSnapshot) => {
      self.routes.replace(routesSnapshot)
    },
    updateResultType(type: "normal" | "different-date" | "not-found") {
      self.resultType = type
    },
  }))
  .actions((self) => ({
    getRoutes: async (originId: string, destinationId: string, time: number): Promise<RouteItem[]> => {
      self.setStatus("pending")
      self.updateResultType("normal")

      const routeApi = new RouteApi(self.environment.api)
      let foundRoutes = false
      let apiHitCount = 0
      let requestDate = time

      // If no routes are found, try to fetch results for the upcoming 3 days.
      while (!foundRoutes && apiHitCount < 4) {
        // Format times for Israel Rail API
        const date = format(requestDate, "yyyy-MM-dd")
        const hour = format(time, "HH:mm")

        const result = await routeApi.getRoutes(originId, destinationId, date, hour)

        if (result.length > 0) {
          foundRoutes = true
          self.saveRoutes(result)
          self.setStatus("done")

          if (apiHitCount > 0) {
            // We found routes for a date different than the requested date.
            self.updateResultType("different-date")
          }

          return result
        } else {
          apiHitCount += 1
          requestDate = add(requestDate, { days: 1 }).getTime()
        }
      }
      // We couldn't find routes for the requested date.
      self.updateResultType("not-found")
      self.setStatus("done")
      throw new Error("Not found")
    },
  }))
  .postProcessSnapshot(omit(["routes", "resultType"]))

type RouteType = Instance<typeof trainRoutesModel>
export interface Route extends RouteType {}
type RouteSnapshotType = SnapshotOut<typeof trainRoutesModel>
export interface RouteSnapshot extends RouteSnapshotType {}
export const createRouteDefaultModel = () => types.optional(trainRoutesModel, {})
