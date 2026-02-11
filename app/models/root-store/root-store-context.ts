import { useRoutePlanStore } from "../route-plan/route-plan"
import { useTrainRoutesStore } from "../train-routes/train-routes"
import { useRecentSearchesStore } from "../recent-searches/recent-searches"
import { useFavoritesStore } from "../favorites/favorites"
import { useSettingsStore } from "../settings/settings"
import { useRideStore } from "../ride/ride"
import { useUserStore } from "../user/user"
import { clearAllData } from "./setup-root-store"

/**
 * A hook that screens can use to gain access to our stores, with
 * `const { routePlan, trainRoutes } = useStores()`,
 *
 * Maintains the same API as the previous MobX-based implementation.
 */
export function useStores() {
  const routePlan = useRoutePlanStore()
  const trainRoutes = useTrainRoutesStore()
  const recentSearches = useRecentSearchesStore()
  const favoriteRoutes = useFavoritesStore()
  const settings = useSettingsStore()
  const ride = useRideStore()
  const user = useUserStore()

  return {
    routePlan,
    trainRoutes,
    recentSearches,
    favoriteRoutes,
    settings,
    ride,
    user,
    clearAllData,
  }
}

export type RootStore = ReturnType<typeof useStores>
