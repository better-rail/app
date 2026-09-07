import { useCallback, useSyncExternalStore } from "react"
import {
  favoriteRoutes,
  recentRoutes,
  hideSlowTrainsPreference,
  routePlan,
  subscribeToStorage,
  type StoredRoute,
  type StoredRoutePlan,
} from "@/lib/storage"

const EMPTY: StoredRoute[] = []
let recentCache: { raw: string; value: StoredRoute[] } | null = null
let favoritesCache: { raw: string; value: StoredRoute[] } | null = null

/** Memoises by serialised value so `useSyncExternalStore` receives a stable reference. */
function stable(cache: typeof recentCache, next: StoredRoute[]) {
  const raw = JSON.stringify(next)
  if (cache && cache.raw === raw) return cache
  return { raw, value: next }
}

export function useRecentRoutes(): StoredRoute[] {
  return useSyncExternalStore(
    subscribeToStorage,
    () => (recentCache = stable(recentCache, recentRoutes.get())).value,
    () => EMPTY,
  )
}

export function useFavoriteRoutes(): StoredRoute[] {
  return useSyncExternalStore(
    subscribeToStorage,
    () => (favoritesCache = stable(favoritesCache, favoriteRoutes.get())).value,
    () => EMPTY,
  )
}

export function useIsFavorite(route: StoredRoute): [boolean, () => void] {
  const favorites = useFavoriteRoutes()
  const isFavorite = favorites.some((r) => r.originId === route.originId && r.destinationId === route.destinationId)
  const { originId, destinationId } = route
  const toggle = useCallback(() => favoriteRoutes.toggle({ originId, destinationId }), [originId, destinationId])
  return [isFavorite, toggle]
}

export function useHideSlowTrains(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribeToStorage, hideSlowTrainsPreference.get, () => false)
  return [value, hideSlowTrainsPreference.set]
}

const EMPTY_PLAN: StoredRoutePlan = {}
let planCache: { raw: string; value: StoredRoutePlan } | null = null

/** The persisted planner selection; empty during SSR and until hydration. */
export function useStoredRoutePlan(): StoredRoutePlan {
  return useSyncExternalStore(
    subscribeToStorage,
    () => {
      const next = routePlan.get()
      const raw = JSON.stringify(next)
      if (!planCache || planCache.raw !== raw) planCache = { raw, value: next }
      return planCache.value
    },
    () => EMPTY_PLAN,
  )
}
