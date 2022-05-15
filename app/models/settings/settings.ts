import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { translate, TxKeyPath } from "../../i18n"

export const SettingsModel = types
  .model("Settings")
  .props({ profileCode: types.optional(types.number, 1), totalTip: types.optional(types.number, 0) })
  .views((self) => ({
    get profileCodeLabel() {
      const profile = PROFILE_CODES.find((profileCode) => profileCode.value === self.profileCode)
      return translate(profile.label)
    },
  }))

  .actions((self) => ({
    setProfileCode(code: number) {
      self.profileCode = code
    },

    addTip(amount: number) {
      self.totalTip = self.totalTip + amount
    },
  }))

type SettingsType = Instance<typeof SettingsModel>
export interface Settings extends SettingsType {}
type SettingsSnapshotType = SnapshotOut<typeof SettingsModel>
export interface SettingsSnapshot extends SettingsSnapshotType {}
export const createSettingsDefaultModel = () => types.optional(SettingsModel, {})

export const PROFILE_CODES: { label: TxKeyPath; value: number }[] = [
  { label: "profileCodes.general", value: 1 },
  { label: "profileCodes.studentRegular", value: 19 },
  { label: "profileCodes.studentExtended", value: 3 },
  { label: "profileCodes.seniorCitizen", value: 4 },
  { label: "profileCodes.disabled", value: 5 },
  { label: "profileCodes.youth", value: 33 },
  { label: "profileCodes.socialSecurity", value: 40 },
]
