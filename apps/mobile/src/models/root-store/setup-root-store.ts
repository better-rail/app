import * as storage from "@/utils/storage"
import { Appearance } from "react-native"
import { UnistylesRuntime } from "react-native-unistyles"
import { syncAnalyticsUserProperties } from "@/services/analytics"
import { applyAccentTheme } from "@/theme/apply-accent-theme"
import { isAccentThemeSupported } from "@/utils/accent-theme-support"
import {
  useRoutePlanStore,
  getRoutePlanSnapshot,
  hydrateRoutePlanStore,
  resetRoutePlanStore,
} from "@/models/route-plan/route-plan"
import { getTrainRoutesSnapshot, hydrateTrainRoutesStore, resetTrainRoutesStore } from "@/models/train-routes/train-routes"
import {
  useRecentSearchesStore,
  getRecentSearchesSnapshot,
  hydrateRecentSearchesStore,
  resetRecentSearchesStore,
} from "@/models/recent-searches/recent-searches"
import { useFavoritesStore, getFavoritesSnapshot, hydrateFavoritesStore, resetFavoritesStore } from "@/models/favorites/favorites"
import {
  useSettingsStore,
  getSettingsSnapshot,
  hydrateSettingsStore,
  resetSettingsStore,
  type ColorSchemePreference,
} from "@/models/settings/settings"
import { useRideStore, getRideSnapshot, hydrateRideStore, initializeRideStore, resetRideStore } from "@/models/ride/ride"
import { initializeArrivalAlarm } from "@/models/ride/arrival-alarm"
import { useUserStore, getUserSnapshot, hydrateUserStore, resetUserStore } from "@/models/user/user"
import { useVouchersStore, getVouchersSnapshot, hydrateVouchersStore, resetVouchersStore } from "@/models/vouchers/vouchers"
import {
  useRecurringRidesStore,
  getRecurringRidesSnapshot,
  hydrateRecurringRidesStore,
  resetRecurringRidesStore,
} from "@/models/recurring-rides/recurring-rides"

const ROOT_STATE_STORAGE_KEY = "root"
const TELEMETRY_DISABLED_STORAGE_KEY = "telemetry_disabled"
let appearanceAnalyticsSubscription: ReturnType<typeof Appearance.addChangeListener> | undefined

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
    vouchers: getVouchersSnapshot(useVouchersStore.getState()),
    recurringRides: getRecurringRidesSnapshot(useRecurringRidesStore.getState()),
  }
}

// Purchases must await durable accounting before finishing a StoreKit transaction.
export async function persistRootStore() {
  const saved = storage.save(ROOT_STATE_STORAGE_KEY, getSnapshot())
  if (!saved) throw new Error("Failed to persist app state")
}

/**
 * Setup the root state - loads persisted data and subscribes to changes.
 * Synchronous, so it can run before the first render.
 *
 * The "root" key was first written by MobX State Tree. The snapshot format is compatible:
 * MST's onSnapshot produced plain JSON with the same key structure our hydrate functions expect.
 */
export function setupRootStore() {
  const data = storage.load(ROOT_STATE_STORAGE_KEY) || {}

  // Hydrate each store individually so a failure in one doesn't prevent others
  const hydrators = [
    () => hydrateRoutePlanStore(data.routePlan),
    () => hydrateTrainRoutesStore(data.trainRoutes),
    () => hydrateRecentSearchesStore(data.recentSearches),
    () => hydrateFavoritesStore(data.favoriteRoutes),
    () => hydrateSettingsStore(data.settings),
    () => hydrateRideStore(data.ride),
    () => hydrateUserStore(data.user),
    () => hydrateVouchersStore(data.vouchers),
    () => hydrateRecurringRidesStore(data.recurringRides),
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

  // Restore both native colors and Unistyles before rendering the first screen.
  const applyColorScheme = (colorScheme: ColorSchemePreference) => {
    Appearance.setColorScheme(colorScheme === "automatic" ? "unspecified" : colorScheme)
    if (colorScheme === "automatic") {
      UnistylesRuntime.setAdaptiveThemes(true)
    } else {
      UnistylesRuntime.setAdaptiveThemes(false)
      UnistylesRuntime.setTheme(colorScheme)
    }
    syncAnalyticsUserProperties({
      color_scheme: Appearance.getColorScheme() ?? "unspecified",
      color_scheme_preference: colorScheme,
    })
  }
  applyColorScheme(useSettingsStore.getState().colorScheme)
  // Binaries before v3 have no themes, so they keep the classic look
  const applyTheme = () => {
    const { accentTheme, useAlternateTimeFont } = useSettingsStore.getState()
    const supported = isAccentThemeSupported()
    if (supported) applyAccentTheme(accentTheme, useAlternateTimeFont)
    else applyAccentTheme("default")
    syncAnalyticsUserProperties({ accent_theme: supported ? accentTheme : "default" })
  }
  applyTheme()

  appearanceAnalyticsSubscription?.remove()
  appearanceAnalyticsSubscription = Appearance.addChangeListener(({ colorScheme }) => {
    if (useSettingsStore.getState().colorScheme !== "automatic") return
    syncAnalyticsUserProperties({ color_scheme: colorScheme ?? "unspecified", color_scheme_preference: "automatic" })
  })

  // Run afterCreate equivalents
  initializeRideStore()
  initializeArrivalAlarm()

  // Subscribe to all store changes and persist snapshots
  const persist = () => storage.save(ROOT_STATE_STORAGE_KEY, getSnapshot())

  useRoutePlanStore.subscribe(persist)
  useRecentSearchesStore.subscribe(persist)
  useFavoritesStore.subscribe(persist)
  useSettingsStore.subscribe((state, previousState) => {
    if (state.colorScheme !== previousState.colorScheme) applyColorScheme(state.colorScheme)
    if (state.accentTheme !== previousState.accentTheme || state.useAlternateTimeFont !== previousState.useAlternateTimeFont) {
      applyTheme()
    }
    persist()
  })
  useRideStore.subscribe(persist)
  useUserStore.subscribe(persist)
  useVouchersStore.subscribe(persist)
  useRecurringRidesStore.subscribe(persist)

  // Keep the standalone telemetry flag, read before the stores exist, in line with the user store
  const { disableTelemetry } = useUserStore.getState()
  if (disableTelemetry === true) {
    storage.save(TELEMETRY_DISABLED_STORAGE_KEY, true)
  } else if (disableTelemetry === false) {
    storage.remove(TELEMETRY_DISABLED_STORAGE_KEY)
  }
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
  resetVouchersStore()
  resetRecurringRidesStore()
}
