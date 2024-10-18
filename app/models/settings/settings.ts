import { Instance, SnapshotOut, types } from "mobx-state-tree"
import { translate, TxKeyPath } from "../../i18n"
import { PopUpMessage } from "../../services/api"

export const SettingsModel = types
  .model("Settings")
  .props({
    stationsNotifications: types.optional(types.array(types.string), []),
    seenNotificationsScreen: types.optional(types.boolean, false),
    seenUrgentMessagesIds: types.optional(types.array(types.number), []),
    profileCode: types.optional(types.number, 1),
    totalTip: types.optional(types.number, 0),
  })
  .views((self) => ({
    get profileCodeLabel() {
      const profile = PROFILE_CODES.find((profileCode) => profileCode.value === self.profileCode)
      return translate(profile.label)
    },
  }))
  .actions((self) => ({
    setSeenNotificationsScreen(seen: boolean) {
      self.seenNotificationsScreen = seen
    },
    setStationsNotifications(stations: string[]) {
      self.stationsNotifications.replace(stations)
    },
    addStationNotification(stationId: string) {
      const updatedStations = [...self.stationsNotifications, stationId]
      this.setStationsNotifications(updatedStations)
    },

    removeStationNotification(stationId: string) {
      const updatedStations = self.stationsNotifications.filter((station) => station !== stationId)
      this.setStationsNotifications(updatedStations)
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
  .actions((self) => ({
    setSeenUrgentMessagesIds(messagesIds: number[]) {
      self.seenUrgentMessagesIds.replace(messagesIds)
    },
    filterUnseenUrgentMessages(messages: PopUpMessage[]) {
      return messages.filter((message) => !self.seenUrgentMessagesIds.includes(message.id))
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
