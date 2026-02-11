import { create } from "zustand"
import { Platform } from "react-native"
import { setAnalyticsUserProperty } from "../../services/analytics"
import { getIsWatchAppInstalled, updateApplicationContext, getIsPaired, WatchPayload } from "react-native-watch-connectivity"
import Shortcuts from "react-native-quick-actions-shortcuts"
import { stationLocale, stationsObject } from "../../data/stations"
import { translate } from "../../i18n"
import { isEmpty } from "lodash"

if (Platform.OS === "ios") {
  // set analytics user property for apple watch
  getIsPaired().then((isPaired) => {
    setAnalyticsUserProperty("watch_paired", isPaired ? "true" : "false")
  })

  getIsWatchAppInstalled().then((isInstalled) => {
    setAnalyticsUserProperty("watch_app_installed", isInstalled ? "true" : "false")
  })
}

export type FavoriteRoute = {
  id: string
  originId: string
  destinationId: string
  label?: string
}

export interface FavoritesState {
  routes: FavoriteRoute[]
}

export interface FavoritesActions {
  syncFavorites: () => void
  syncFavoritesToAppleWatch: () => void
  syncFavoritesToHomeShortcuts: () => void
  add: (route: FavoriteRoute) => void
  remove: (routeId: string) => void
  rename: (routeId: string, newLabel: string) => void
}

export type FavoritesStore = FavoritesState & FavoritesActions

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  routes: [],

  syncFavorites() {
    if (Platform.OS === "ios") {
      getIsWatchAppInstalled().then((isInstalled) => {
        if (isInstalled) {
          get().syncFavoritesToAppleWatch()
        }
      })
    }

    get().syncFavoritesToHomeShortcuts()
  },

  syncFavoritesToAppleWatch() {
    const appContext: WatchPayload = {}
    get().routes.forEach((route, index) => {
      const label = isEmpty(route.label) ? "" : `,label:${route.label}`
      appContext[index] = `originId:${route.originId},destinationId:${route.destinationId}${label}`
    })
    updateApplicationContext(appContext)
  },

  syncFavoritesToHomeShortcuts() {
    const fromText = (route: FavoriteRoute) =>
      translate("favorites.fromStation", { stationName: stationsObject[route.originId][stationLocale] })
    const toText = (route: FavoriteRoute) =>
      translate("favorites.toStation", { stationName: stationsObject[route.destinationId][stationLocale] })

    Shortcuts.setShortcuts(
      get().routes.map((route) => ({
        type: `favorite-${route.id}`,
        title: route.label || fromText(route),
        subtitle: !route.label && toText(route),
        iconName: "star",
        data: {
          originId: route.originId,
          destinationId: route.destinationId,
        },
      })),
    )
  },

  add(route) {
    set((state) => ({ routes: [...state.routes, { ...route }] }))
    get().syncFavorites()
  },

  remove(routeId) {
    set((state) => ({ routes: state.routes.filter((favorite) => favorite.id !== routeId) }))
    get().syncFavorites()
  },

  rename(routeId, newLabel) {
    set((state) => ({
      routes: state.routes.map((favorite) => {
        if (routeId === favorite.id) {
          return { ...favorite, label: newLabel }
        }
        return favorite
      }),
    }))
    get().syncFavorites()
  },
}))

export function getFavoritesSnapshot(state: FavoritesState) {
  return { routes: state.routes }
}

export function hydrateFavoritesStore(data: any) {
  if (!data) return
  useFavoritesStore.setState({
    routes: data.routes ?? [],
  })
  // Sync favorites after hydration (replaces afterCreate)
  useFavoritesStore.getState().syncFavorites()
}
