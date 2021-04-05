import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { RoutePlanModel } from "../route-plan/route-plan"
import { RouteModel } from "../route/route"

/**
 * A RootStore model.
 */
// prettier-ignore
export const RootStoreModel = types.model("RootStore").props({
  routePlan: types.optional(RoutePlanModel, {} as any),
  route: types.optional(RouteModel, {} as any)
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
