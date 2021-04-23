import { Instance, SnapshotOut, types } from "mobx-state-tree"

export type Voucher = {
  id: string //
  barcodeImage: string
  stationName: string
  date: number
}

/**
 * Model description here for TypeScript hints.
 */
export const VouchersModel = types
  .model("Vouchers")
  .props({
    vouchers: types.array(
      types.model({ id: types.identifier, barcodeImage: types.string, stationName: types.string, date: types.number }),
    ),
  })
  .actions((self) => ({
    addVoucher(voucher: Voucher) {
      self.vouchers.push(voucher)
    },
    removeVoucher(voucher: Voucher) {
      self.vouchers.remove(voucher)
    },
  }))

type VouchersType = Instance<typeof VouchersModel>
export interface Vouchers extends VouchersType {}
type VouchersSnapshotType = SnapshotOut<typeof VouchersModel>
export interface VouchersSnapshot extends VouchersSnapshotType {}
export const createVouchersDefaultModel = () => types.optional(VouchersModel, {})
