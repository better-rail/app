import * as storage from "../../utils/storage"
import { useRoutePlanStore, getRoutePlanSnapshot, hydrateRoutePlanStore, resetRoutePlanStore } from "../route-plan/route-plan"
import { getTrainRoutesSnapshot, hydrateTrainRoutesStore, resetTrainRoutesStore } from "../train-routes/train-routes"
import { useRecentSearchesStore, getRecentSearchesSnapshot, hydrateRecentSearchesStore, resetRecentSearchesStore } from "../recent-searches/recent-searches"
import { useFavoritesStore, getFavoritesSnapshot, hydrateFavoritesStore, resetFavoritesStore } from "../favorites/favorites"
import { useSettingsStore, getSettingsSnapshot, hydrateSettingsStore, resetSettingsStore } from "../settings/settings"
import { useRideStore, getRideSnapshot, hydrateRideStore, initializeRideStore, resetRideStore } from "../ride/ride"
import { useUserStore, getUserSnapshot, hydrateUserStore, resetUserStore } from "../user/user"

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
 *
 * This reads from the same "root" AsyncStorage key that was previously used
 * by MobX State Tree. The snapshot format is compatible: MST's onSnapshot
 * produced plain JSON with the same key structure our hydrate functions expect.
 * On first run after migration, the data is re-persisted in Zustand format.
 */
export async function setupRootStore() {
  let data: any

  try {
    data = (await storage.load(ROOT_STATE_STORAGE_KEY)) || {}
  } catch (e) {
    data = {}
  }

  // Hydrate each store individually so a failure in one doesn't prevent others
  const hydrators = [
    () => hydrateRoutePlanStore(data.routePlan),
    () => hydrateTrainRoutesStore(data.trainRoutes),
    () => hydrateRecentSearchesStore(data.recentSearches),
    () => hydrateFavoritesStore(data.favoriteRoutes),
    () => hydrateSettingsStore(data.settings),
    () => hydrateRideStore(data.ride),
    () => hydrateUserStore(data.user),
  ]

  for (const hydrate of hydrators) {
    try {
      hydrate()
    } catch (e) {
      // If a store fails to hydrate, it keeps its defaults
      if (__DEV__) {
        console.warn("Store hydration failed:", e)
      }
    }
  }

  // Run afterCreate equivalents
  initializeRideStore()

  // Re-persist immediately to normalize the data format.
  // This ensures any data saved by the old MobX State Tree format
  // is re-written in the Zustand snapshot format on first launch.
  await storage.save(ROOT_STATE_STORAGE_KEY, getSnapshot())

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
  resetRoutePlanStore()
  resetTrainRoutesStore()
  resetRecentSearchesStore()
  resetFavoritesStore()
  resetSettingsStore()
  resetRideStore()
  resetUserStore()
}
