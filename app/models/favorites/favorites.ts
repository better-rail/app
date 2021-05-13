import { Instance, SnapshotOut, types } from "mobx-state-tree"

export const favoriteRouteSchema = {
  id: types.string,
  originId: types.string,
  destinationId: types.string,
}

/**
 * Favorite routes store.
 */
export const FavoritesModel = types
  .model("Favorites")
  .props({
    routes: types.array(types.model(favoriteRouteSchema)),
  })
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars

type FavoritesType = Instance<typeof FavoritesModel>
export interface Favorites extends FavoritesType {}
type FavoritesSnapshotType = SnapshotOut<typeof FavoritesModel>
export interface FavoritesSnapshot extends FavoritesSnapshotType {}
export const createFavoritesDefaultModel = () => types.optional(FavoritesModel, {})
