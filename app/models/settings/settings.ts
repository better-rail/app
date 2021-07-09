import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { translate } from "../../i18n"

export const SettingsModel = types
  .model("Settings")
  .props({ profileCode: types.optional(types.number, 1) })
  .views((self) => ({
    get profileCodeLabel() {
      const profile = PROFILE_CODES.find((profileCode) => profileCode.value === self.profileCode)
      return profile.label
    },
  }))

  .actions((self) => ({
    setProfileCode(code: number) {
      self.profileCode = code
    },
  }))

type SettingsType = Instance<typeof SettingsModel>
export interface Settings extends SettingsType {}
type SettingsSnapshotType = SnapshotOut<typeof SettingsModel>
export interface SettingsSnapshot extends SettingsSnapshotType {}
export const createSettingsDefaultModel = () => types.optional(SettingsModel, {})

export const PROFILE_CODES = [
  { label: translate("profileCodes.general"), value: 1 },
  { label: translate("profileCodes.studentRegular"), value: 19 },
  { label: translate("profileCodes.studentExtended"), value: 3 },
  { label: translate("profileCodes.seniorCitizen"), value: 4 },
  { label: translate("profileCodes.disabled"), value: 5 },
  { label: translate("profileCodes.youth"), value: 33 },
  { label: translate("profileCodes.socialSecurity"), value: 40 },
]
