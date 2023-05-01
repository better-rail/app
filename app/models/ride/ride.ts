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

const endRideHandler: (routeId: string) => Promise<boolean> = Platform.select({
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
    /**
     * The ride id
     */
    id: types.maybe(types.string),
    /**
     * The ride route
     */
    route: types.maybe(types.model(trainRouteSchema)),
  })
  .actions((self) => ({
    afterCreate() {
      if (self.id) {
        // We check if the ride is still active.
        this.isRideActive(self.id)
      }
    },

    startRide(route: RouteItem) {
      this.setRideLoading(true)

      startRideHandler(route)
        .then((rideId) => {
          this.setRoute(route)
          this.setRideId(rideId)
          this.setRideLoading(false)
        })
        .catch(() => {
          this.setRideLoading(false)
          alert(
            "An error occured while starting the ride.\nIf the issue persists, please let us know!\n\n Our email: feedback@better-rail.co.il.",
          )
        })
    },
    stopRide(routeId: string) {
      this.setRideLoading(true)
      this.setRideId(undefined)
      this.setRoute(undefined)

      endRideHandler(routeId).then(() => {
        this.setRideLoading(false)
      })
    },
    setRoute(route: RouteItem) {
      self.route = route as any
    },
    setRideLoading(state: boolean) {
      self.loading = state
    },
    setRideId(rideId: string) {
      self.id = rideId
    },

    isRideActive(rideId: string) {
      if (Platform.OS === "ios") {
        iOSHelpers.isRideActive(rideId).then((tokens) => {
          // TODO: Check if ride Id exists in the array.
          // Currently .rideId arrives always empty, so we only check if the array is empty.
          // stop ride if it's not active
          if (tokens && tokens.length === 0) {
            this.stopRide(rideId)
          }
        })
      }
    },
  }))
  .postProcessSnapshot(omit(["loading"]))

type RideType = Instance<typeof RideModel>
export interface Ride extends RideType {}
type RideSnapshotType = SnapshotOut<typeof RideModel>
export interface RideSnapshot extends RideSnapshotType {}
export const createRideDefaultModel = () => types.optional(RideModel, {})
