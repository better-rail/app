import { create } from "zustand"
import { TxKeyPath } from "@/i18n"
import { PopUpMessage } from "@/services/api"

/** Max train changes to show in results; null means no limit. */
export type MaxChanges = 0 | 1 | null

export interface SettingsState {
  seenUrgentMessagesIds: number[]
  profileCode: number
  totalTip: number
  recordedTipTransactionIds: string[]
  showRouteCardHeader: boolean
  hideSlowTrains: boolean
  maxChanges: MaxChanges
  seenTrainInfoPrompt: boolean
  seenLawsuitAnnouncement: boolean
}

export interface SettingsActions {
  setProfileCode: (code: number) => void
  recordTip: (transactionId: string, amount: number) => void
  setShowRouteCardHeader: (show: boolean) => void
  setHideSlowTrains: (hide: boolean) => void
  setMaxChanges: (maxChanges: MaxChanges) => void
  setSeenUrgentMessagesIds: (messagesIds: number[]) => void
  setSeenTrainInfoPrompt: (seen: boolean) => void
  setSeenLawsuitAnnouncement: (seen: boolean) => void
}

export type SettingsStore = SettingsState & SettingsActions

const initialSettingsState: SettingsState = {
  seenUrgentMessagesIds: [],
  profileCode: 1,
  totalTip: 0,
  recordedTipTransactionIds: [],
  showRouteCardHeader: false,
  hideSlowTrains: false,
  maxChanges: null,
  seenTrainInfoPrompt: false,
  seenLawsuitAnnouncement: false,
}

export const resetSettingsStore = () => useSettingsStore.setState(initialSettingsState)

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...initialSettingsState,

  setProfileCode(code) {
    set({ profileCode: code })
  },

  recordTip(transactionId, amount) {
    if (get().recordedTipTransactionIds.includes(transactionId)) return
    set((state) => ({
      totalTip: state.totalTip + amount,
      recordedTipTransactionIds: [...state.recordedTipTransactionIds, transactionId],
    }))
  },

  setShowRouteCardHeader(show) {
    set({ showRouteCardHeader: show })
  },

  setHideSlowTrains(hide) {
    set({ hideSlowTrains: hide })
  },

  setMaxChanges(maxChanges) {
    set({ maxChanges })
  },

  setSeenUrgentMessagesIds(messagesIds) {
    set({ seenUrgentMessagesIds: messagesIds })
  },

  setSeenTrainInfoPrompt(seen) {
    set({ seenTrainInfoPrompt: seen })
  },

  setSeenLawsuitAnnouncement(seen) {
    set({ seenLawsuitAnnouncement: seen })
  },
}))

/** Filters a route list of date headers (strings) and routes, dropping headers left without routes. */
export function filterRouteDataByMaxChanges<T extends { trains: unknown[] }>(data: (T | string)[], maxChanges: MaxChanges) {
  if (maxChanges === null) return data

  const result: (T | string)[] = []
  let pendingHeader: string | null = null
  for (const item of data) {
    if (typeof item === "string") {
      pendingHeader = item
    } else if (item.trains.length - 1 <= maxChanges) {
      if (pendingHeader !== null) result.push(pendingHeader)
      pendingHeader = null
      result.push(item)
    }
  }
  return result
}

export function filterUnseenUrgentMessages(messages: PopUpMessage[], seenIds: number[]) {
  return messages.filter((message) => !seenIds.includes(message.id))
}

export function getSettingsSnapshot(state: SettingsState) {
  return {
    seenUrgentMessagesIds: state.seenUrgentMessagesIds,
    profileCode: state.profileCode,
    totalTip: state.totalTip,
    recordedTipTransactionIds: state.recordedTipTransactionIds,
    showRouteCardHeader: state.showRouteCardHeader,
    hideSlowTrains: state.hideSlowTrains,
    maxChanges: state.maxChanges,
    seenTrainInfoPrompt: state.seenTrainInfoPrompt,
    seenLawsuitAnnouncement: state.seenLawsuitAnnouncement,
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
    seenUrgentMessagesIds: processedData.seenUrgentMessagesIds ?? [],
    profileCode: processedData.profileCode ?? 1,
    totalTip: processedData.totalTip ?? 0,
    recordedTipTransactionIds: processedData.recordedTipTransactionIds ?? [],
    showRouteCardHeader: processedData.showRouteCardHeader ?? false,
    hideSlowTrains: processedData.hideSlowTrains ?? false,
    maxChanges: processedData.maxChanges ?? null,
    seenTrainInfoPrompt: processedData.seenTrainInfoPrompt ?? false,
    seenLawsuitAnnouncement: processedData.seenLawsuitAnnouncement ?? false,
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
