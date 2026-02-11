import * as storage from "../../utils/storage"
import { useRoutePlanStore, getRoutePlanSnapshot, hydrateRoutePlanStore } from "../route-plan/route-plan"
import { useTrainRoutesStore, getTrainRoutesSnapshot, hydrateTrainRoutesStore } from "../train-routes/train-routes"
import { useRecentSearchesStore, getRecentSearchesSnapshot, hydrateRecentSearchesStore } from "../recent-searches/recent-searches"
import { useFavoritesStore, getFavoritesSnapshot, hydrateFavoritesStore } from "../favorites/favorites"
import { useSettingsStore, getSettingsSnapshot, hydrateSettingsStore } from "../settings/settings"
import { useRideStore, getRideSnapshot, hydrateRideStore, initializeRideStore } from "../ride/ride"
import { useUserStore, getUserSnapshot, hydrateUserStore } from "../user/user"

/**
 * The key we'll be saving our state as within async storage.
 */
const ROOT_STATE_STORAGE_KEY = "root"
const TELEMETRY_DISABLED_STORAGE_KEY = "telemetry_disabled"

/**
 * Collects a full snapshot of all stores for persistence.
 */
function getSnapshot() {
  return {
    routePlan: getRoutePlanSnapshot(useRoutePlanStore.getState()),
    trainRoutes: getTrainRoutesSnapshot(),
    recentSearches: getRecentSearchesSnapshot(useRecentSearchesStore.getState()),
    favoriteRoutes: getFavoritesSnapshot(useFavoritesStore.getState()),
    settings: getSettingsSnapshot(useSettingsStore.getState()),
    ride: getRideSnapshot(useRideStore.getState()),
    user: getUserSnapshot(useUserStore.getState()),
  }
}

/**
 * Setup the root state - loads persisted data and subscribes to changes.
 */
export async function setupRootStore() {
  let data: any

  try {
    data = (await storage.load(ROOT_STATE_STORAGE_KEY)) || {}
  } catch (e) {
    data = {}
  }

  // Hydrate all stores from persisted data
  try {
    hydrateRoutePlanStore(data.routePlan)
    hydrateTrainRoutesStore(data.trainRoutes)
    hydrateRecentSearchesStore(data.recentSearches)
    hydrateFavoritesStore(data.favoriteRoutes)
    hydrateSettingsStore(data.settings)
    hydrateRideStore(data.ride)
    hydrateUserStore(data.user)
  } catch (e) {
    // If there's any problem loading, stores keep their defaults
  }

  // Run afterCreate equivalents
  initializeRideStore()

  // Sync telemetry disabled flag with async storage for backwards compatibility
  const userState = useUserStore.getState()
  if (userState.disableTelemetry === true) {
    const telemetryDisabledFlag = await storage.load(TELEMETRY_DISABLED_STORAGE_KEY)
    if (!telemetryDisabledFlag) {
      await storage.save(TELEMETRY_DISABLED_STORAGE_KEY, true)
    }
  } else if (userState.disableTelemetry === false) {
    await storage.remove(TELEMETRY_DISABLED_STORAGE_KEY)
  }

  // Subscribe to all store changes and persist snapshots
  const persist = () => storage.save(ROOT_STATE_STORAGE_KEY, getSnapshot())

  useRoutePlanStore.subscribe(persist)
  useTrainRoutesStore.subscribe(persist)
  useRecentSearchesStore.subscribe(persist)
  useFavoritesStore.subscribe(persist)
  useSettingsStore.subscribe(persist)
  useRideStore.subscribe(persist)
  useUserStore.subscribe(persist)
}

/**
 * Clears all store data back to defaults.
 */
export function clearAllData() {
  useRoutePlanStore.setState({
    origin: undefined,
    destination: undefined,
    date: new Date(),
    dateType: "departure",
  })
  useTrainRoutesStore.setState({
    routes: [],
    resultType: "normal",
    status: "idle",
  })
  useRecentSearchesStore.setState({ entries: [] })
  useFavoritesStore.setState({ routes: [] })
  useSettingsStore.setState({
    stationsNotifications: [],
    seenNotificationsScreen: false,
    seenUrgentMessagesIds: [],
    profileCode: 1,
    totalTip: 0,
    showRouteCardHeader: false,
    hideSlowTrains: false,
  })
  useRideStore.setState({
    loading: false,
    id: undefined,
    route: undefined,
    activityAuthorizationInfo: undefined,
    notifeeSettings: undefined,
    rideCount: 0,
    canRunLiveActivities: false,
  })
  useUserStore.setState({ disableTelemetry: undefined })
}
