import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"

const StationSchema = {
  id: types.string,
  name: types.string,
}

/**
 * Model description here for TypeScript hints.
 */
export const RoutePlanModel = types
  .model("RoutePlan")
  .props({
    origin: types.maybe(types.model(StationSchema)),
    destination: types.maybe(types.model(StationSchema)),
    date: types.optional(types.Date, () => new Date()),
  })
  .actions((self) => ({
    setOrigin(station) {
      self.origin = station
    },
    setDestination(station) {
      self.destination = station
    },
    setDate(date) {
      self.date = date
    },
    switchDirection() {
      const origin = Object.assign({}, self.origin)
      const destination = Object.assign({}, self.destination)

      this.setOrigin(destination)
      this.setDestination(origin)
    },
  }))
  .postProcessSnapshot(omit(["date"]))

type RoutePlanType = Instance<typeof RoutePlanModel>
export interface RoutePlan extends RoutePlanType {}
type RoutePlanSnapshotType = SnapshotOut<typeof RoutePlanModel>
export interface RoutePlanSnapshot extends RoutePlanSnapshotType {}
export const createRoutePlanDefaultModel = () => types.optional(RoutePlanModel, {})
