import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withEnvironment } from "../extensions/with-environment"
import { RouteApi } from "../../services/api/route-api"

const TrainListSchema = {
  arrivalTime: types.string,
  departureTime: types.string,
  originStationId: types.string,
  destinationStationId: types.string,
  stopStations: types.array(
    types.model({
      arrivalTime: types.string,
      departureTime: types.string,
      stationId: types.string,
      stationName: types.string,
      platform: types.string,
    }),
  ),
}

const TrainRouteSchema = {
  isExchange: types.boolean,
  estTime: types.string,
  trains: types.array(types.model(TrainListSchema)),
}

/**
 * Model description here for TypeScript hints.
 */
export const RouteModel = types
  .model("Route")
  .props({
    routes: types.array(types.model(TrainRouteSchema)),
    state: "pending",
  })
  .extend(withEnvironment)
  .actions((self) => ({
    saveRoutes: (routesSnapshot) => {
      self.routes.replace(routesSnapshot)
    },
    updateState(state: "pending" | "loading" | "loaded" | "error") {
      self.state = state
    },
  }))
  .actions((self) => ({
    getRoutes: async (originId: string, destinationId: string, date: string, hour: string) => {
      self.updateState("loading")
      const routeApi = new RouteApi(self.environment.api)
      const result = await routeApi.getRoutes(originId, destinationId, date, hour)
      self.saveRoutes(result)
      self.updateState("loaded")
      // if (result.kind === "ok") {
      //   self.saveCharacters(result.characters)
      // } else {
      //   __DEV__ && console.tron.log(result.kind)
      // }
    },
  }))

type RouteType = Instance<typeof RouteModel>
export interface Route extends RouteType {}
type RouteSnapshotType = SnapshotOut<typeof RouteModel>
export interface RouteSnapshot extends RouteSnapshotType {}
export const createRouteDefaultModel = () => types.optional(RouteModel, {})
