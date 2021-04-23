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
    list: types.array(
      types.model({ id: types.identifier, barcodeImage: types.string, stationName: types.string, date: types.number }),
    ),
  })
  .views((self) => {
    return {
      get sortedList() {
        return self.list.slice().sort((a, b) => b.date - a.date)
      },
    }
  })
  .actions((self) => ({
    addVoucher(voucher: Voucher) {
      self.list.push(voucher)
    },
    removeVoucher(voucherId: string) {
      const newArr = self.list.filter((v) => v.id !== voucherId)
      self.list.replace(newArr)
    },
  }))

type VouchersType = Instance<typeof VouchersModel>
export interface Vouchers extends VouchersType {}
type VouchersSnapshotType = SnapshotOut<typeof VouchersModel>
export interface VouchersSnapshot extends VouchersSnapshotType {}
export const createVouchersDefaultModel = () => types.optional(VouchersModel, {})
