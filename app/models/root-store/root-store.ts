import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { RoutePlanModel } from "../route-plan/route-plan"
import { trainRoutesModel } from "../train-routes/train-routes"
import { VoucherDetailsModel } from "../voucher-details/voucher-details"
import { VouchersModel } from "../vouchers/vouchers"

/**
 * A RootStore model.
 */
// prettier-ignore
export const RootStoreModel = types.model("RootStore").props({
  routePlan: types.optional(RoutePlanModel, {} as any),
  trainRoutes: types.optional(trainRoutesModel, {} as any),
  voucherDetails: types.optional(VoucherDetailsModel, {} as any),
  vouchers: types.optional(VouchersModel, {} as any)
})

/**
 * The RootStore instance.
 */
export interface RootStore extends Instance<typeof RootStoreModel> {}

/**
 * The data of a RootStore.
 */
export interface RootStoreSnapshot extends SnapshotOut<typeof RootStoreModel> {}
