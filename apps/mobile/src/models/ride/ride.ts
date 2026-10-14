import { create } from "zustand"
import { Platform } from "react-native"
import type AndroidHelpersModule from "@/utils/notification-helpers"
import iOSHelpers, { ActivityAuthorizationInfo } from "@/utils/ios-helpers"
import { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { cancelArrivalAlarm } from "@/utils/arrival-alarm-native"
import { addStopRideListener, isLiveRideSupported, type NotificationPermissionState } from "@/modules/live-ride"
import { head, last } from "lodash"
import { formatDateForAPI } from "@/utils/helpers/date-helpers"
import { addMinutes } from "date-fns"
import { translate } from "@/i18n"
import * as Sentry from "@sentry/react-native"
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
    scope.setFingerprint(["live-ride-start-failed", tags.ride_start_stage, tags.ride_start_reason])
    Sentry.captureException(error)
  })

  trackEvent("start_live_ride_failed", tags)
}

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
  notificationPermissionState: NotificationPermissionState | undefined
  rideCount: number
  canRunLiveActivities: boolean
  arrivalAlarm: ArrivalAlarm | undefined
  /** A ride whose server-side alarm couldn't be removed yet, so it doesn't keep pushing moves */
  pendingArrivalAlarmRemoval: string | undefined
  /** Android: the rider was already asked to let the alarm take over the lock screen */
  arrivalAlarmFullScreenPrompted: boolean
}

export interface RideActions {
  setNotificationPermissionState: (newSettings: NotificationPermissionState) => void
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
  notificationPermissionState: undefined,
  rideCount: 0,
  canRunLiveActivities: isLiveRideSupported(),
  arrivalAlarm: undefined,
  pendingArrivalAlarmRemoval: undefined,
  arrivalAlarmFullScreenPrompted: false,
}

export const resetRideStore = () => {
  const { id, arrivalAlarm } = useRideStore.getState()
  if (arrivalAlarm) {
    cancelArrivalAlarm()
    if (id) new RideApi().removeRideAlarm(id)
  }

  useRideStore.setState(initialRideState)
}

export const useRideStore = create<RideStore>((set, get) => ({
  ...initialRideState,

  setNotificationPermissionState(newSettings) {
    set({ notificationPermissionState: newSettings })
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
    if (Platform.OS === "android") {
      const supported = isLiveRideSupported()
      set({ canRunLiveActivities: supported })
      return supported
    }
    set({ canRunLiveActivities: false })
    return false
  },

  async checkLiveRideAuthorization() {
    const { canRunLiveActivities } = get()
    if (!canRunLiveActivities) return

    if (Platform.OS === "ios") {
      const info = await iOSHelpers.activityAuthorizationInfo()
      set({ activityAuthorizationInfo: info })
    } else if (Platform.OS === "android") {
      const state = await androidHelpers().getPermissionState()
      set({ notificationPermissionState: state })
    }
  },

  startRide(route) {
    const { canRunLiveActivities } = get()
    if (!canRunLiveActivities) return

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
    if (!canRunLiveActivities) return

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

    if (Platform.OS === "ios" && canRunLiveActivities) {
      iOSHelpers.isRideActive(rideId).then((tokens) => {
        if (tokens && tokens.length === 0) {
          get().stopRide(rideId)
        }
      })
    } else if (Platform.OS === "android") {
      if (!route || !id) return

      const originId = head(route.trains)?.originStationId
      const destinationId = last(route.trains)?.destinationStationId
      if (!originId || !destinationId) return

      const [date, time] = formatDateForAPI(route.departureTime)

      const options = { viaStation: route.viaStationId }
      routeApi
        .getRoutes(originId.toString(), destinationId.toString(), date, time, options)
        .then((routes) => {
          const currentRouteTrains = route.trains.map((train) => train.trainNumber).join()
          const currentRoute = routes.find((r) => currentRouteTrains === r.trains.map((train) => train.trainNumber).join())

          if (
            currentRoute &&
            Date.now() >= addMinutes(currentRoute.arrivalTime, last(currentRoute.trains)?.delay ?? 0).getTime()
          ) {
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
    notificationPermissionState: data.notificationPermissionState ?? undefined,
    rideCount: data.rideCount ?? 0,
    canRunLiveActivities: data.canRunLiveActivities ?? false,
    arrivalAlarm: data.arrivalAlarm ?? undefined,
    pendingArrivalAlarmRemoval: data.pendingArrivalAlarmRemoval ?? undefined,
    arrivalAlarmFullScreenPrompted: data.arrivalAlarmFullScreenPrompted ?? false,
  })
}

let stopListenerRegistered = false

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

  if (!stopListenerRegistered) {
    stopListenerRegistered = true
    addStopRideListener(() => {
      const currentId = useRideStore.getState().id
      if (currentId) {
        useRideStore.getState().stopRide(currentId)
      }
    })
  }
}
