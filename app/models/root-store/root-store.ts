import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { RoutePlanModel } from "../route-plan/route-plan"
import { trainRoutessModel } from "../route/route"

/**
 * A RootStore model.
 */
// prettier-ignore
export const RootStoreModel = types.model("RootStore").props({
  routePlan: types.optional(RoutePlanModel, {} as any),
  trainRoutes: types.optional(trainRoutessModel, {} as any)
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
