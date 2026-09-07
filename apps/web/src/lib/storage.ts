// Per-browser preferences in localStorage. Every access is try/catch-wrapped: storage may be unavailable (private mode, SSR).
const RECENT_KEY = "better-rail:recent-routes"
const FAVORITES_KEY = "better-rail:favorite-routes"
const SLOW_TRAINS_KEY = "better-rail:hide-slow-trains"
const MAX_RECENT = 6

export interface StoredRoute {
  originId: string
  destinationId: string
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    window.dispatchEvent(new Event("better-rail:storage"))
  } catch {
    // storage is a convenience — ignore failures
  }
}

const sameRoute = (a: StoredRoute, b: StoredRoute) => a.originId === b.originId && a.destinationId === b.destinationId

export const recentRoutes = {
  get: () => read<StoredRoute[]>(RECENT_KEY, []),
  add(route: StoredRoute) {
    const next = [route, ...recentRoutes.get().filter((r) => !sameRoute(r, route))].slice(0, MAX_RECENT)
    write(RECENT_KEY, next)
  },
  clear: () => write(RECENT_KEY, []),
}

export const favoriteRoutes = {
  get: () => read<StoredRoute[]>(FAVORITES_KEY, []),
  has: (route: StoredRoute) => favoriteRoutes.get().some((r) => sameRoute(r, route)),
  toggle(route: StoredRoute) {
    const current = favoriteRoutes.get()
    const next = current.some((r) => sameRoute(r, route)) ? current.filter((r) => !sameRoute(r, route)) : [route, ...current]
    write(FAVORITES_KEY, next)
    return next.some((r) => sameRoute(r, route))
  },
}

export const hideSlowTrainsPreference = {
  get: () => read<boolean>(SLOW_TRAINS_KEY, false),
  set: (value: boolean) => write(SLOW_TRAINS_KEY, value),
}

/** Subscribes to changes made through this module (same tab) and by other tabs. */
export function subscribeToStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {}
  window.addEventListener("better-rail:storage", callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener("better-rail:storage", callback)
    window.removeEventListener("storage", callback)
  }
}

const ROUTE_PLAN_KEY = "better-rail:route-plan"

export interface StoredRoutePlan {
  originId?: string
  destinationId?: string
}

/** The stations currently picked in the planner — restored on the next visit, like the app does. */
export const routePlan = {
  get: () => read<StoredRoutePlan>(ROUTE_PLAN_KEY, {}),
  set: (plan: StoredRoutePlan) => write(ROUTE_PLAN_KEY, plan),
}
