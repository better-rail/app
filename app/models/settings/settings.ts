import { create } from "zustand"
import { translate, TxKeyPath } from "../../i18n"
import { PopUpMessage } from "../../services/api"

export interface SettingsState {
  stationsNotifications: string[]
  seenNotificationsScreen: boolean
  seenUrgentMessagesIds: number[]
  profileCode: number
  totalTip: number
  showRouteCardHeader: boolean
  hideSlowTrains: boolean
}

export interface SettingsActions {
  setSeenNotificationsScreen: (seen: boolean) => void
  setStationsNotifications: (stations: string[]) => void
  addStationNotification: (stationId: string) => void
  removeStationNotification: (stationId: string) => void
  setProfileCode: (code: number) => void
  addTip: (amount: number) => void
  setShowRouteCardHeader: (show: boolean) => void
  setHideSlowTrains: (hide: boolean) => void
  setSeenUrgentMessagesIds: (messagesIds: number[]) => void
  filterUnseenUrgentMessages: (messages: PopUpMessage[]) => PopUpMessage[]
  profileCodeLabel: () => string
}

export type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  stationsNotifications: [],
  seenNotificationsScreen: false,
  seenUrgentMessagesIds: [],
  profileCode: 1,
  totalTip: 0,
  showRouteCardHeader: false,
  hideSlowTrains: false,

  setSeenNotificationsScreen(seen) {
    set({ seenNotificationsScreen: seen })
  },

  setStationsNotifications(stations) {
    set({ stationsNotifications: stations })
  },

  addStationNotification(stationId) {
    set((state) => ({ stationsNotifications: [...state.stationsNotifications, stationId] }))
  },

  removeStationNotification(stationId) {
    set((state) => ({
      stationsNotifications: state.stationsNotifications.filter((station) => station !== stationId),
    }))
  },

  setProfileCode(code) {
    set({ profileCode: code })
  },

  addTip(amount) {
    set((state) => ({ totalTip: state.totalTip + amount }))
  },

  setShowRouteCardHeader(show) {
    set({ showRouteCardHeader: show })
  },

  setHideSlowTrains(hide) {
    set({ hideSlowTrains: hide })
  },

  setSeenUrgentMessagesIds(messagesIds) {
    set({ seenUrgentMessagesIds: messagesIds })
  },

  filterUnseenUrgentMessages(messages) {
    const { seenUrgentMessagesIds } = get()
    return messages.filter((message) => !seenUrgentMessagesIds.includes(message.id))
  },

  profileCodeLabel() {
    const { profileCode } = get()
    const profile = PROFILE_CODES.find((p) => p.value === profileCode)
    return translate(profile.label)
  },
}))

export function getSettingsSnapshot(state: SettingsState) {
  return {
    stationsNotifications: state.stationsNotifications,
    seenNotificationsScreen: state.seenNotificationsScreen,
    seenUrgentMessagesIds: state.seenUrgentMessagesIds,
    profileCode: state.profileCode,
    totalTip: state.totalTip,
    showRouteCardHeader: state.showRouteCardHeader,
    hideSlowTrains: state.hideSlowTrains,
  }
}

export function hydrateSettingsStore(data: any) {
  if (!data) return

  // Migration: handle old "hideCollectorTrains" property
  let processedData = { ...data }
  if (data.hideCollectorTrains !== undefined && !("hideSlowTrains" in data)) {
    processedData.hideSlowTrains = data.hideCollectorTrains
  }
  delete processedData.hideCollectorTrains

  useSettingsStore.setState({
    stationsNotifications: processedData.stationsNotifications ?? [],
    seenNotificationsScreen: processedData.seenNotificationsScreen ?? false,
    seenUrgentMessagesIds: processedData.seenUrgentMessagesIds ?? [],
    profileCode: processedData.profileCode ?? 1,
    totalTip: processedData.totalTip ?? 0,
    showRouteCardHeader: processedData.showRouteCardHeader ?? false,
    hideSlowTrains: processedData.hideSlowTrains ?? false,
  })
}

export const PROFILE_CODES: { label: TxKeyPath; value: number }[] = [
  { label: "profileCodes.general", value: 1 },
  { label: "profileCodes.studentRegular", value: 19 },
  { label: "profileCodes.studentExtended", value: 3 },
  { label: "profileCodes.seniorCitizen", value: 4 },
  { label: "profileCodes.disabled", value: 5 },
  { label: "profileCodes.youth", value: 33 },
  { label: "profileCodes.socialSecurity", value: 40 },
]
