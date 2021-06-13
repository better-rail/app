import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { translate } from "../../i18n"

export type DateType = "departure" | "arrival"

const StationSchema = {
  id: types.string,
  name: types.string,
}

export const RoutePlanModel = types
  .model("RoutePlan")
  .props({
    origin: types.maybe(types.model(StationSchema)),
    destination: types.maybe(types.model(StationSchema)),
    date: types.optional(types.Date, () => new Date()),
    dateType: types.optional(types.enumeration(["departure", "arrival"]), "departure"),
  })
  .views((self) => {
    return {
      get dateTypeDisplayName() {
        if (self.dateType === "departure") return translate("plan.departureTime")
        return translate("plan.arrivalTime")
      },
    }
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
    setDateType(type: DateType) {
      self.dateType = type
    },
    switchDirection() {
      // Handle cases where the origin/destination are undefined (for example, on initial app launch)
      const origin = self.origin ? Object.assign({}, self.origin) : undefined
      const destination = self.destination ? Object.assign({}, self.destination) : undefined

      this.setOrigin(destination)
      this.setDestination(origin)
    },
  }))
  .postProcessSnapshot(omit(["date", "dateType"]))

type RoutePlanType = Instance<typeof RoutePlanModel>
export interface RoutePlan extends RoutePlanType {}
type RoutePlanSnapshotType = SnapshotOut<typeof RoutePlanModel>
export interface RoutePlanSnapshot extends RoutePlanSnapshotType {}
export const createRoutePlanDefaultModel = () => types.optional(RoutePlanModel, {})
