import { Instance, SnapshotOut, types } from "mobx-state-tree"

const StationModel = types.model({
  id: types.identifierNumber,
  name: types.string,
  image: types.maybe(types.string),
})

/**
 * Model description here for TypeScript hints.
 */
export const RoutePlanModel = types
  .model("RoutePlan")
  .props({
    origin: types.maybe(types.map(StationModel)),
    destination: types.maybe(types.map(StationModel)),
  })
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    setOrigin(stationName) {
      self.origin = stationName
    },
    setDestination(stationName) {
      self.destination = stationName
    },
  }))

type RoutePlanType = Instance<typeof RoutePlanModel>
export interface RoutePlan extends RoutePlanType {}
type RoutePlanSnapshotType = SnapshotOut<typeof RoutePlanModel>
export interface RoutePlanSnapshot extends RoutePlanSnapshotType {}
export const createRoutePlanDefaultModel = () => types.optional(RoutePlanModel, {})
