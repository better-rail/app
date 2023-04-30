import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { Platform } from "react-native"
import iOSHelpers from "../../utils/ios-helpers"
import { trainRouteSchema } from "../train-routes/train-routes"
import { RouteItem } from "../../services/api"

const startRideHandler: (route: RouteItem) => Promise<string> = Platform.select({
  ios: iOSHelpers.startLiveActivity,
  android: () => Promise.resolve(""),
})

const endRideHandler: () => Promise<boolean> = Platform.select({
  ios: iOSHelpers.endLiveActivity,
  android: () => Promise.resolve(true),
})

/**
 * Live Ride store.
 */
export const RideModel = types
  .model("Ride")
  .props({
    /**
     * Whether the user has requested to start a ride and
     * it's being registered at the moment.
     */
    loading: types.optional(types.boolean, false),
    id: types.maybe(types.string),
    route: types.maybe(types.model(trainRouteSchema)),
  })
  .actions((self) => ({
    afterCreate() {
      if (Platform.OS === "ios") {
        iOSHelpers.isRideActive(self.id).then((tokens) => {
          // TODO: Check if ride Id exists in the array. Currently .rideId arrives always empty
          console.log("tokens", tokens.length)
          if (tokens && tokens.length === 0) {
            this.stopRide()
          }
        })
      }
    },
    startRide(route: RouteItem) {
      this.setRideLoading(true)

      startRideHandler(route)
        .then((rideId) => {
          self.route = route as any
          this.setRideId(rideId)
        })
        .finally(() => {
          this.setRideLoading(false)
        })
    },
    setRideLoading(state: boolean) {
      self.loading = state
    },
    setRideId(rideId: string) {
      self.id = rideId
    },
    stopRide() {
      this.setRideLoading(true)

      endRideHandler()
        .then(() => {
          self.id = undefined
        })
        .finally(() => {
          this.setRideLoading(false)
        })
    },
  }))
  .postProcessSnapshot(omit(["loading"]))

type RideType = Instance<typeof RideModel>
export interface Ride extends RideType {}
type RideSnapshotType = SnapshotOut<typeof RideModel>
export interface RideSnapshot extends RideSnapshotType {}
export const createRideDefaultModel = () => types.optional(RideModel, {})
