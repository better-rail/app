import { create } from "zustand"
import { Platform } from "react-native"
import type AndroidHelpersModule from "@/utils/notification-helpers"
import iOSHelpers, { ActivityAuthorizationInfo } from "@/utils/ios-helpers"
import { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { RideApi } from "@/services/api/ride-api"
import { cancelArrivalAlarm } from "@/utils/arrival-alarm-native"
import { head, last } from "lodash"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"
import { addMinutes } from "date-fns"
import { translate } from "@/i18n"
import * as Sentry from "@sentry/react-native"
import notifee, { NotificationSettings } from "@notifee/react-native"
import { trackEvent } from "@/services/analytics"
import { showErrorAlert } from "@/utils/helpers/error-alert"
import { rideStartErrorLevel, rideStartErrorTags } from "@/utils/helpers/ride-errors"
import { isSameRoute } from "@/utils/helpers/ride-helpers"

const routeApi = new RouteApi()

const reportRideStartFailure = (error: unknown, route: RouteItem) => {
  const tags = rideStartErrorTags(error)

  Sentry.withScope((scope) => {
    scope.setLevel(rideStartErrorLevel(error))
    scope.setTags({ feature: "live_ride", ...tags })
    scope.setContext("ride", {
      originId: head(route.trains)?.originStationId,
      destinationId: last(route.trains)?.destinationStationId,
      trains: route.trains.map((train) => train.trainNumber),
      departureDate: route.departureTimeString,
      delay: route.delay,
    })
    // Group these in Sentry by stage + reason. Without it they'd group by the axios message, which includes the URL.
    scope.setFingerprint(["live-ride-start-failed", tags.ride_start_stage, tags.ride_start_reason])
    Sentry.captureException(error)
  })

  trackEvent("start_live_ride_failed", tags)
}

// Loaded lazily to avoid a require cycle (notification-helpers imports back into the ride hooks/models).
// The Android helpers are only used at runtime on Android, so a deferred require is safe here.
const androidHelpers = () => (require("@/utils/notification-helpers") as { default: typeof AndroidHelpersModule }).default

const startRideHandler = (route: RouteItem): Promise<string> =>
  Platform.OS === "ios" ? iOSHelpers.startLiveActivity(route) : androidHelpers().startRideNotifications(route)

const endRideHandler = (routeId: string): Promise<boolean> =>
  Platform.OS === "ios" ? iOSHelpers.endLiveActivity(routeId) : androidHelpers().endRideNotifications(routeId)

export type ArrivalAlarm = {
  rideId: string
  alarmId: string
  leadMinutes: number
  /** When it rings, in ms */
  fireDate: number
}

export interface RideState {
  loading: boolean
  id: string | undefined
  route: RouteItem | undefined
  activityAuthorizationInfo: { areActivitiesEnabled: boolean; frequentPushesEnabled: boolean } | undefined
  notifeeSettings: { notifications: number; alarms: number } | undefined
  rideCount: number
  canRunLiveActivities: boolean
  arrivalAlarm: ArrivalAlarm | undefined
  /** A ride whose server-side alarm couldn't be removed yet, so it doesn't keep pushing moves */
  pendingArrivalAlarmRemoval: string | undefined
  /** Android: the rider was already asked to let the alarm take over the lock screen */
  arrivalAlarmFullScreenPrompted: boolean
}

export interface RideActions {
  setNotifeeSettings: (newSettings: NotificationSettings) => void
  setActivityAuthorizationInfo: (newInfo: ActivityAuthorizationInfo) => void
  setCanRunLiveActivities: (value: boolean) => void
  checkLiveActivitiesSupported: () => Promise<boolean>
  checkLiveRideAuthorization: () => Promise<void>
  startRide: (route: RouteItem) => void
  stopRide: (rideId: string) => Promise<void>
  setRoute: (route: RouteItem | undefined) => void
  setRideLoading: (state: boolean) => void
  setRideId: (rideId: string | undefined) => void
  setRideCount: (count: number) => void
  isRideActive: (rideId: string) => void
  isRouteActive: (routeItem: RouteItem) => boolean
  originId: () => number | undefined
  destinationId: () => number | undefined
}

export type RideStore = RideState & RideActions

const initialRideState: RideState = {
  loading: false,
  id: undefined,
  route: undefined,
  activityAuthorizationInfo: undefined,
  notifeeSettings: undefined,
  rideCount: 0,
  canRunLiveActivities: false,
  arrivalAlarm: undefined,
  pendingArrivalAlarmRemoval: undefined,
  arrivalAlarmFullScreenPrompted: false,
}

export const resetRideStore = () => {
  const { id, arrivalAlarm } = useRideStore.getState()
  // Deleting all data mustn't leave an alarm that rings, or that the server keeps moving.
  if (arrivalAlarm) {
    cancelArrivalAlarm()
    if (id) new RideApi().removeRideAlarm(id)
  }

  useRideStore.setState(initialRideState)
}

export const useRideStore = create<RideStore>((set, get) => ({
  ...initialRideState,

  setNotifeeSettings(newSettings) {
    set({
      notifeeSettings: {
        notifications: newSettings.authorizationStatus,
        alarms: newSettings.android.alarm,
      },
    })
  },

  setActivityAuthorizationInfo(newInfo) {
    set({ activityAuthorizationInfo: newInfo })
  },

  setCanRunLiveActivities(value) {
    set({ canRunLiveActivities: value })
  },

  async checkLiveActivitiesSupported() {
    if (Platform.OS === "ios") {
      const supported = await iOSHelpers.canRunLiveActivities()
      set({ canRunLiveActivities: supported })
      return supported
    }
    return false
  },

  async checkLiveRideAuthorization() {
    const { canRunLiveActivities } = get()
    if (canRunLiveActivities) {
      const info = await iOSHelpers.activityAuthorizationInfo()
      set({ activityAuthorizationInfo: info })
    } else if (Platform.OS === "android") {
      const settings = await notifee.getNotificationSettings()
      get().setNotifeeSettings(settings)
    }
  },

  startRide(route) {
    const { canRunLiveActivities } = get()
    if (Platform.OS === "ios" && !canRunLiveActivities) return

    set({ loading: true, route })

    startRideHandler(route)
      .then((rideId) => {
        set((state) => ({ id: rideId, loading: false, rideCount: state.rideCount + 1 }))
      })
      .catch((error) => {
        set({ route: undefined, id: undefined, loading: false })

        if (Platform.OS === "android") {
          androidHelpers().cancelNotifications()
        }

        reportRideStartFailure(error, route)
        showErrorAlert({ title: translate("ride.error") })
      })
  },

  async stopRide(rideId) {
    const { canRunLiveActivities } = get()
    if (Platform.OS === "ios" && !canRunLiveActivities) return

    // The ride's alarm goes with it. Its server side is removed with the ride.
    if (get().arrivalAlarm) {
      cancelArrivalAlarm()
    }

    set({ loading: true, id: undefined, route: undefined, arrivalAlarm: undefined, pendingArrivalAlarmRemoval: undefined })

    await endRideHandler(rideId)
    set({ loading: false })
  },

  setRoute(route) {
    set({ route })
  },

  setRideLoading(state) {
    set({ loading: state })
  },

  setRideId(rideId) {
    set({ id: rideId })
  },

  setRideCount(count) {
    set({ rideCount: count })
  },

  isRideActive(rideId) {
    const { canRunLiveActivities, route, id } = get()

    if (canRunLiveActivities) {
      iOSHelpers.isRideActive(rideId).then((tokens) => {
        if (tokens && tokens.length === 0) {
          get().stopRide(rideId)
        }
      })
    } else if (Platform.OS === "android") {
      if (!route || !id) return

      const originId = head(route.trains).originStationId
      const destinationId = last(route.trains).destinationStationId
      const [date, time] = formatDateForAPI(route.departureTime)

      const options = { viaStation: route.viaStationId }
      routeApi
        .getRoutes(originId.toString(), destinationId.toString(), date, time, options)
        .then((routes) => {
          const currentRouteTrains = route.trains.map((train) => train.trainNumber).join()
          const currentRoute = routes.find((r) => currentRouteTrains === r.trains.map((train) => train.trainNumber).join())

          if (currentRoute && Date.now() >= addMinutes(currentRoute.arrivalTime, last(currentRoute.trains).delay).getTime()) {
            get().stopRide(rideId)
          }
        })
        .catch((error) => console.error("Failed to check ride arrival", error))
    }
  },

  isRouteActive(routeItem) {
    return isSameRoute(get().route, routeItem)
  },

  originId() {
    const route = get().route
    if (!route) return undefined
    return route.trains[0].originStationId
  },

  destinationId() {
    const route = get().route
    if (!route) return undefined
    const lastTrainIndex = route.trains.length - 1
    return route.trains[lastTrainIndex].destinationStationId
  },
}))

// Exclude loading from persistence (transient state)
export function getRideSnapshot(state: RideState) {
  const { loading, ...rest } = state
  return rest
}

export function hydrateRideStore(data: any) {
  if (!data) return
  useRideStore.setState({
    loading: false,
    id: data.id ?? undefined,
    route: data.route ?? undefined,
    activityAuthorizationInfo: data.activityAuthorizationInfo ?? undefined,
    notifeeSettings: data.notifeeSettings ?? undefined,
    rideCount: data.rideCount ?? 0,
    canRunLiveActivities: data.canRunLiveActivities ?? false,
    arrivalAlarm: data.arrivalAlarm ?? undefined,
    pendingArrivalAlarmRemoval: data.pendingArrivalAlarmRemoval ?? undefined,
    arrivalAlarmFullScreenPrompted: data.arrivalAlarmFullScreenPrompted ?? false,
  })
}

/**
 * Run afterCreate logic - checks if ride is still active and authorization.
 * Should be called after hydration.
 */
export function initializeRideStore() {
  const state = useRideStore.getState()
  if (state.id) {
    state.isRideActive(state.id)
  }
  state.checkLiveRideAuthorization()
}
