import { Instance, SnapshotOut, types } from "mobx-state-tree"

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
    add(route: FavoriteRoute) {
      self.routes.push({ ...route })
    },
    remove(route: FavoriteRoute) {
      const filteredFavorites = self.routes.filter((favorite) => favorite.id !== route.id)
      self.routes.replace(filteredFavorites)
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
