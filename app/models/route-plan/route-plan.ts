import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { translate } from "../../i18n"
import { NativeModules, Platform } from "react-native"

const { RNBetterRail } = NativeModules

// Saves the current route to iOS App Group
// Later it'll be used by the widget as the initial route
// TODO: Move to another file
function sendCurrentRouteToiOS(originId: string, destinationId: string) {
  if (Platform.OS === "ios") {
    RNBetterRail.saveCurrentRoute(originId, destinationId)
  }
}

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
        if (self.dateType === "departure") return translate("plan.leaveAt")
        return translate("plan.arriveAt")
      },
    }
  })

  .actions((self) => ({
    setOrigin(station) {
      self.origin = station
      sendCurrentRouteToiOS(self.origin.id, self.destination?.id)
    },
    setDestination(station) {
      self.destination = station
      sendCurrentRouteToiOS(self.origin.id, self.destination?.id)
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
