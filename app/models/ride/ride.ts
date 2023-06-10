import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { omit } from "ramda"
import { PermissionsAndroid, Platform } from "react-native"
import messaging from "@react-native-firebase/messaging"
import iOSHelpers, { ActivityAuthorizationInfo } from "../../utils/ios-helpers"
import { trainRouteSchema } from "../train-routes/train-routes"
import { RideApi, RouteItem } from "../../services/api"
import { RouteApi } from "../../services/api/route-api"
import { head, last } from "lodash"
import { formatDateForAPI } from "../../utils/helpers/date-helpers"
import { addMinutes } from "date-fns"

const routeApi = new RouteApi()
const rideApi = new RideApi()
let unsubscribeTokenUpdates: () => void

const startRideHandler: (route: RouteItem) => Promise<string> = Platform.select({
  ios: iOSHelpers.startLiveActivity,
  android: async (route: RouteItem) => {
    if (PermissionsAndroid.RESULTS[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] !== "granted") {
      throw new Error("User didn't activate notifications")
    }

    // TODO: Add token refresh logic
    const token = await messaging().getToken()
    const rideId = await rideApi.startRide(route, token)

    if (!rideId) {
      throw new Error("Couldn't start ride")
    }

    unsubscribeTokenUpdates = messaging().onTokenRefresh((newToken) => {
      rideApi.updateRideToken(rideId, newToken)
    })

    return rideId
  },
})

const endRideHandler: (routeId: string) => Promise<boolean> = Platform.select({
  ios: iOSHelpers.endLiveActivity,
  android: (rideId: string) => {
    unsubscribeTokenUpdates()
    return rideApi.endRide(rideId)
  },
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
      if (Platform.OS === "ios") {
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
      if (Platform.OS === "ios") {
        iOSHelpers.isRideActive(rideId).then((tokens) => {
          // TODO: Check if ride Id exists in the array.
          // Currently .rideId arrives always empty, so we only check if the array is empty.
          // stop ride if it's not active
          if (tokens && tokens.length === 0) {
            this.stopRide(rideId)
          }
        })
      } else {
        if (!self.route || !self.id) return

        const originId = head(self.route.trains).originStationId
        const destinationId = last(self.route.trains).destinationStationId
        const [date, time] = formatDateForAPI(self.route.departureTime)

        routeApi.getRoutes(originId.toString(), destinationId.toString(), date, time).then((routes) => {
          const currentRouteTrains = self.route.trains.map((train) => train.trainNumber).join()
          const currentRoute = routes.find(
            (route) => currentRouteTrains === route.trains.map((train) => train.trainNumber).join(),
          )

          if (currentRoute && Date.now() >= addMinutes(currentRoute.arrivalTime, last(currentRoute.trains).delay).getTime()) {
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
