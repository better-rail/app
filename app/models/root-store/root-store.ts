import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { RoutePlanModel } from "../route-plan/route-plan"
import { trainRoutesModel } from "../train-routes/train-routes"
import { RecentSearchesModel } from "../recent-searches/recent-searches"
import { FavoritesModel } from "../favorites/favorites"
import { SettingsModel } from "../settings/settings"
import { RideModel } from "../ride/ride"
import { UserModel } from "../user/user"

/**
 * A RootStore model.
 */
// prettier-ignore
export const RootStoreModel = types
  .model("RootStore")
  .props({
    routePlan: types.optional(RoutePlanModel, {} as any),
    trainRoutes: types.optional(trainRoutesModel, {} as any),
    recentSearches: types.optional(RecentSearchesModel, {} as any),
    favoriteRoutes: types.optional(FavoritesModel, {} as any),
    settings: types.optional(SettingsModel, {} as any),
    ride: types.optional(RideModel, {} as any),
    user: types.optional(UserModel, {} as any),
  })
  .actions((self) => ({
    clearAllData() {
      self.routePlan = RoutePlanModel.create({})
      self.trainRoutes = trainRoutesModel.create({})
      self.recentSearches = RecentSearchesModel.create({})
      self.favoriteRoutes = FavoritesModel.create({})
      self.settings = SettingsModel.create({})
      self.ride = RideModel.create({})
      self.user = UserModel.create({})
    },
  }))

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
