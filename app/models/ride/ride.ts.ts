import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { Platform } from "react-native"
import { isRideActive } from "../../utils/ios-helpers"

/**
 * Favorite routes store.
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
  })
  .actions((self) => ({
    afterCreate() {
      if (Platform.OS === "ios") {
        isRideActive(self.id).then((tokens) => {
          // TODO: Check if ride Id exists in the array. Currently .rideId arrives always empty
          console.log("tokens", tokens.length)
          if (tokens && tokens.length === 0) {
            this.stopRide()
          }
        })
      }
    },
    setRideLoading(state: boolean) {
      self.loading = state
    },
    setRideId(rideId: string) {
      self.id = rideId
    },
    stopRide() {
      self.id = undefined
    },
  }))
  .postProcessSnapshot(omit(["loading"]))

type RideType = Instance<typeof RideModel>
export interface Ride extends RideType {}
type RideSnapshotType = SnapshotOut<typeof RideModel>
export interface RideSnapshot extends RideSnapshotType {}
export const createRideDefaultModel = () => types.optional(RideModel, {})
