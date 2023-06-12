import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { Platform } from "react-native"
import iOSHelpers, { ActivityAuthorizationInfo, canRunLiveActivities } from "../../utils/ios-helpers"
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
    /**
     * Activity authorization info
     */
    activityAuthorizationInfo: types.maybe(
      types.model({
        areActivitiesEnabled: types.boolean,
        frequentPushesEnabled: types.boolean,
      }),
    ),
  })
  .views((self) => ({
    /**
     *
     */
    get originId() {
      if (!self.route) return undefined
      return self.route.trains[0].originStationId
    },
    get destinationId() {
      if (!self.route) return undefined
      const lastTrainIndex = self.route.trains.length - 1
      return self.route.trains[lastTrainIndex].destinationStationId
    },
  }))
  .actions((self) => ({
    setActivityAuthorizationInfo(newInfo: ActivityAuthorizationInfo) {
      self.activityAuthorizationInfo = newInfo
    },
    async checkActivityAuthorizationInfo() {
      if (canRunLiveActivities) {
        const info = await iOSHelpers.activityAuthorizationInfo()
        this.setActivityAuthorizationInfo(info)
      }
    },
    afterCreate() {
      if (self.id) {
        // We check if the ride is still active.
        this.isRideActive(self.id)
      }

      this.checkActivityAuthorizationInfo()
    },
    startRide(route: RouteItem) {
      if (!canRunLiveActivities) return

      this.setRideLoading(true)
      this.setRoute(route)

      startRideHandler(route)
        .then((rideId) => {
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
    stopRide(rideId: string) {
      if (!canRunLiveActivities) return

      this.setRideLoading(true)
      this.setRideId(undefined)
      this.setRoute(undefined)

      endRideHandler(rideId).then(() => {
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
      if (canRunLiveActivities) {
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
    /**
     * Checks if the given route is the current active route.
     */
    isRouteActive(routeItem: RouteItem) {
      const currentRoute = self.route
      if (!currentRoute) return false

      return (
        currentRoute.departureTime === routeItem.departureTime &&
        currentRoute.trains[0].trainNumber === routeItem.trains[0].trainNumber &&
        currentRoute.trains[currentRoute.trains.length - 1].destinationStationId ===
          routeItem.trains[routeItem.trains.length - 1].destinationStationId
      )
    },
  }))
  .postProcessSnapshot(omit(["loading"]))

type RideType = Instance<typeof RideModel>
export interface Ride extends RideType {}
type RideSnapshotType = SnapshotOut<typeof RideModel>
export interface RideSnapshot extends RideSnapshotType {}
export const createRideDefaultModel = () => types.optional(RideModel, {})
