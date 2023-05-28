import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { Platform } from "react-native"
import {
  getIsWatchAppInstalled,
  updateApplicationContext,
  WatchPayload,
  getApplicationContext,
} from "react-native-watch-connectivity"

let isWatchAppInstalled = false

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
      if (Platform.OS === "ios") {
        getIsWatchAppInstalled().then((isInstalled) => {
          if (isInstalled) {
            this.updateAppleWatchFavorites()
            isWatchAppInstalled = true
          }
        })
      }
    },
    async updateAppleWatchFavorites() {
      const appContext: WatchPayload = (await getApplicationContext()) ?? {}
      const favorites = self.routes.map((route) => `originId:${route.originId},destinationId:${route.destinationId}`)
      appContext["favorites"] = favorites
      updateApplicationContext(appContext)
    },
    add(route: FavoriteRoute) {
      self.routes.push({ ...route })
      if (isWatchAppInstalled) this.updateAppleWatchFavorites()
    },
    remove(routeId: string) {
      const filteredFavorites = self.routes.filter((favorite) => favorite.id !== routeId)
      self.routes.replace(filteredFavorites)
      if (isWatchAppInstalled) this.updateAppleWatchFavorites()
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
