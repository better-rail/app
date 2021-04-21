import { Instance, SnapshotOut, types } from "mobx-state-tree"

/**
 * Model description here for TypeScript hints.
 */
export const voucherDetailsModel = types
  .model("VoucherDetails")
  .props({
    userId: types.string,
    phoneNumber: types.string,
  })
  .views((self) => ({})) // eslint-disable-line @typescript-eslint/no-unused-vars
  .actions((self) => ({
    setUserId(userId: string) {
      self.userId = userId
    },
    setPhoneNumber(phoneNumber: string) {
      self.phoneNumber = phoneNumber
    },
  })) // eslint-disable-line @typescript-eslint/no-unused-vars

/**
 * Un-comment the following to omit model attributes from your snapshots (and from async storage).
 * Useful for sensitive data like passwords, or transitive state like whether a modal is open.

 * Note that you'll need to import `omit` from ramda, which is already included in the project!
 *  .postProcessSnapshot(omit(["password", "socialSecurityNumber", "creditCardNumber"]))
 */

type VoucherDetailsType = Instance<typeof VoucherDetailsModel>
export interface VoucherDetails extends VoucherDetailsType {}
type VoucherDetailsSnapshotType = SnapshotOut<typeof VoucherDetailsModel>
export interface VoucherDetailsSnapshot extends VoucherDetailsSnapshotType {}
export const createVoucherDetailsDefaultModel = () => types.optional(VoucherDetailsModel, {})
