import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { withEnvironment } from "../extensions/with-environment"
import { RouteApi } from "../../services/api/route-api"

/**
 * Model description here for TypeScript hints.
 */
export const RouteModel = types
  .model("Route")
  .props({})
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .extend(withEnvironment)
  .actions((self) => ({
    getRoutes: async (originId: string, destinationId: string, date: string, hour: string) => {
      const routeApi = new RouteApi(self.environment.api)
      const result = await routeApi.getRoutes(originId, destinationId)

      console.log(result)
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
