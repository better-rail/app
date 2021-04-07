import { Instance, SnapshotOut, types } from "mobx-state-tree"
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
  .props({
    routes: types.array(types.model(TrainRouteSchema)),
  })
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .extend(withEnvironment)
  .actions((self) => ({
    saveRoutes: (routesSnapshot) => {
      console.log(routesSnapshot)
      self.routes.replace(routesSnapshot)
    },
  }))
  .actions((self) => ({
    getRoutes: async (originId: string, destinationId: string, date: string, hour: string) => {
      const routeApi = new RouteApi(self.environment.api)
      const result = await routeApi.getRoutes(originId, destinationId, date, hour)

      self.saveRoutes(result)
      // if (result.kind === "ok") {
      //   console.log(result)
      //   self.saveCharacters(result.characters)
      // } else {
      //   __DEV__ && console.tron.log(result.kind)
      // }
    },
  }))
/**
 * Un-comment the following to omit model attributes from your snapshots (and from async storage).
 * Useful for sensitive data like passwords, or transitive state like whether a modal is open.

 * Note that you'll need to import `omit` from ramda, which is already included in the project!
 *  .postProcessSnapshot(omit(["password", "socialSecurityNumber", "creditCardNumber"]))
 */

type RouteType = Instance<typeof RouteModel>
export interface Route extends RouteType {}
type RouteSnapshotType = SnapshotOut<typeof RouteModel>
export interface RouteSnapshot extends RouteSnapshotType {}
export const createRouteDefaultModel = () => types.optional(RouteModel, {})
