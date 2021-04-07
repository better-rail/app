import { Instance, SnapshotOut, ISimpleType, types } from "mobx-state-tree"
import { withEnvironment } from "../extensions/with-environment"
import { RouteApi } from "../../services/api/route-api"

const StopStaionSchema = {
  stationId: types.string,
  arrivalTime: types.string,
  departureTime: types.string,
  platform: types.string,
}

const TrainRouteSchema = {
  isExchange: types.boolean,
  estTime: types.string,
  departureTime: types.string,
  arrivalTime: types.string,
  stopStations: types.array(types.model(StopStaionSchema)),
}

/**
 * Model description here for TypeScript hints.
 */
export const RouteModel = types
  .model("Route")
  .props({ routes: types.array(types.model(TrainRouteSchema)) })
  .extend(withEnvironment)
  .volatile(() => ({
    state: "loading", // TODO: Change to enumeration type
  }))
  .actions((self) => ({
    saveRoutes: (routesSnapshot) => {
      self.routes.replace(routesSnapshot)
    },
    updateState(state: "loading" | "loaded" | "error") {
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
