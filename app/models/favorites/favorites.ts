import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { Platform } from "react-native"
import analytics from "@react-native-firebase/analytics"
import { getIsWatchAppInstalled, updateApplicationContext, getIsPaired, WatchPayload } from "react-native-watch-connectivity"
import Shortcuts from "react-native-quick-actions-shortcuts"
import { stationLocale, stationsObject } from "../../data/stations"
import { translate } from "../../i18n"

if (Platform.OS === "ios") {
  // set analytics user property for apple watch
  getIsPaired().then((isPaired) => {
    analytics().setUserProperty("apple_watch_paired", isPaired ? "true" : "false")
  })

  getIsWatchAppInstalled().then((isInstalled) => {
    analytics().setUserProperty("apple_watch_app_installed", isInstalled ? "true" : "false")
  })
}

export const favoriteRouteSchema = {
  id: types.string,
  originId: types.string,
  destinationId: types.string,
  label: types.maybe(types.string),
}

/**
 * Favorite routes store.
 */
export const FavoritesModel = types
  .model("Favorites")
  .props({
    routes: types.array(types.model(favoriteRouteSchema)),
  })
  .actions((self) => ({
    afterCreate() {
      this.syncFavorites()
    },
    syncFavorites() {
      if (Platform.OS === "ios") {
        getIsWatchAppInstalled().then((isInstalled) => {
          if (isInstalled) {
            this.syncFavoritesToAppleWatch()
          }
        })
      }

      this.syncFavoritesToHomeShortcuts()
    },
    syncFavoritesToAppleWatch() {
      const appContext: WatchPayload = {}
      self.routes.forEach((route, index) => {
        appContext[index] = `originId:${route.originId},destinationId:${route.destinationId}`
      })
      updateApplicationContext(appContext)
    },
    syncFavoritesToHomeShortcuts() {
      const fromText = (route: FavoriteRoute) =>
        translate("favorites.fromStation", { stationName: stationsObject[route.originId][stationLocale] })
      const toText = (route: FavoriteRoute) =>
        translate("favorites.toStation", { stationName: stationsObject[route.destinationId][stationLocale] })

      Shortcuts.setShortcuts(
        self.routes.map((route) => ({
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
    add(route: FavoriteRoute) {
      self.routes.push({ ...route })
      this.syncFavorites()
    },
    remove(routeId: string) {
      const filteredFavorites = self.routes.filter((favorite) => favorite.id !== routeId)
      self.routes.replace(filteredFavorites)
      this.syncFavorites()
    },
    rename(routeId: FavoriteRoute["id"], newLabel: string) {
      const filteredFavorites = self.routes.map((favorite) => {
        if (routeId === favorite.id) {
          return {
            ...favorite,
            label: newLabel,
          }
        }
        return favorite
      })
      self.routes.replace(filteredFavorites)
      this.syncFavorites()
    },
  }))

type FavoritesType = Instance<typeof FavoritesModel>
export interface Favorites extends FavoritesType {}
type FavoritesSnapshotType = SnapshotOut<typeof FavoritesModel>
export interface FavoritesSnapshot extends FavoritesSnapshotType {}
export const createFavoritesDefaultModel = () => types.optional(FavoritesModel, {})

export type FavoriteRoute = {
  id: string
  originId: string
  destinationId: string
  label?: string
}
