import { create } from "zustand"
import { TxKeyPath } from "@/i18n"
import { DAY_TYPES, type DayType } from "@/data/rail-map-layout"
import { DEFAULT_GUARD_MINUTES, type DelayGuard, GUARD_MINUTES_OPTIONS, type PopUpMessage, guardKey } from "@/services/api"

export type { DelayGuard }

export type MaxChanges = 0 | 1 | null

/**
 * A station to get pushed about when it is disrupted: on every line calling there (null) or only on
 * some, and always (null) or only on some of the timetable's days (Sun–Thu, Fri–Sat, nights).
 */
export type StationAlert = {
  stationId: string
  lineIds: string[] | null
  dayTypes: DayType[] | null
}

export { DAY_TYPES }

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
  stationAlerts: StationAlert[]
  /** Whether the server holds this device's subscription, so an emptied list is still told to it. */
  stationAlertsRegistered: boolean
  /** Trains to be told about when they run late (Delay Notifications). */
  delayGuards: DelayGuard[]
  delayGuardsRegistered: boolean
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
  /** Adds the station (every line, always), or changes the lines or days of one already there. */
  setStationAlert: (stationId: string, choice?: Partial<Omit<StationAlert, "stationId">>) => void
  removeStationAlert: (stationId: string) => void
  setStationAlertsRegistered: (registered: boolean) => void
  /** Adds the guard, or changes one already there (same train and boarding station). */
  setDelayGuard: (guard: DelayGuard) => void
  removeDelayGuard: (key: string) => void
  setDelayGuardsRegistered: (registered: boolean) => void
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
  stationAlerts: [],
  stationAlertsRegistered: false,
  delayGuards: [],
  delayGuardsRegistered: false,
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

  setStationAlert(stationId, choice = {}) {
    set((state) => {
      const at = state.stationAlerts.findIndex((a) => a.stationId === stationId)
      const current = at >= 0 ? state.stationAlerts[at] : { stationId, lineIds: null, dayTypes: null }
      const alert: StationAlert = {
        stationId,
        lineIds: someOrNull(choice.lineIds === undefined ? current.lineIds : choice.lineIds),
        dayTypes: someOrNull(choice.dayTypes === undefined ? current.dayTypes : choice.dayTypes),
      }
      const rest = state.stationAlerts.filter((a) => a.stationId !== stationId)
      // Keep the station's place in the list when only its choice changes.
      if (at >= 0) rest.splice(at, 0, alert)
      else rest.push(alert)
      return { stationAlerts: rest }
    })
  },

  removeStationAlert(stationId) {
    set((state) => ({ stationAlerts: state.stationAlerts.filter((a) => a.stationId !== stationId) }))
  },

  setStationAlertsRegistered(registered) {
    set({ stationAlertsRegistered: registered })
  },

  setDelayGuard(guard) {
    set((state) => {
      const key = guardKey(guard)
      const at = state.delayGuards.findIndex((g) => guardKey(g) === key)
      const rest = state.delayGuards.filter((g) => guardKey(g) !== key)
      if (at >= 0) rest.splice(at, 0, guard)
      else rest.push(guard)
      return { delayGuards: rest }
    })
  },

  removeDelayGuard(key) {
    set((state) => ({ delayGuards: state.delayGuards.filter((g) => guardKey(g) !== key) }))
  },

  setDelayGuardsRegistered(registered) {
    set({ delayGuardsRegistered: registered })
  },
}))

/** The guard for a train boarded at a station, when there is one. */
export const delayGuardFor = (guards: DelayGuard[], trainNumber: number, originStationId: string): DelayGuard | undefined =>
  guards.find((g) => g.trainNumber === trainNumber && g.originStationId === originStationId)

/** A set of ids, without repeats, or null for "every one" when it is empty. */
const someOrNull = <T>(ids: T[] | null | undefined): T[] | null => (ids && ids.length > 0 ? [...new Set(ids)] : null)

/** A station's alert from the list, when it is on it. */
export const stationAlertFor = (alerts: StationAlert[], stationId: string): StationAlert | undefined =>
  alerts.find((a) => a.stationId === stationId)

// Drops routes over the limit and date headers left empty
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
    stationAlerts: state.stationAlerts,
    stationAlertsRegistered: state.stationAlertsRegistered,
    delayGuards: state.delayGuards,
    delayGuardsRegistered: state.delayGuardsRegistered,
  }
}

/** The guards as persisted, dropping anything malformed. */
export function normalizeDelayGuards(data: any): DelayGuard[] {
  const raw: unknown[] = Array.isArray(data?.delayGuards) ? data.delayGuards : []
  const guards: DelayGuard[] = []
  for (const item of raw) {
    const g = item as Partial<DelayGuard> | undefined
    if (
      !g ||
      typeof g.trainNumber !== "number" ||
      typeof g.originStationId !== "string" ||
      typeof g.destinationStationId !== "string" ||
      typeof g.departureTime !== "string"
    ) {
      continue
    }
    if (guards.some((other) => guardKey(other) === guardKey(g as DelayGuard))) continue
    const thresholdMinutes = GUARD_MINUTES_OPTIONS.includes(g.thresholdMinutes as number)
      ? (g.thresholdMinutes as number)
      : DEFAULT_GUARD_MINUTES
    guards.push({
      trainNumber: g.trainNumber,
      originStationId: g.originStationId,
      destinationStationId: g.destinationStationId,
      departureTime: g.departureTime,
      thresholdMinutes,
    })
  }
  return guards
}

/** The alerts as persisted, dropping anything malformed; the old per-station list (every line) migrates. */
export function normalizeStationAlerts(data: any): StationAlert[] {
  const raw: unknown[] = Array.isArray(data?.stationAlerts)
    ? data.stationAlerts
    : Array.isArray(data?.stationsNotifications)
      ? data.stationsNotifications.map((stationId: unknown) => ({ stationId, lineIds: null, dayTypes: null }))
      : []
  const alerts: StationAlert[] = []
  for (const item of raw) {
    const alert = item as Partial<StationAlert> | undefined
    if (!alert || typeof alert.stationId !== "string" || alerts.some((a) => a.stationId === alert.stationId)) continue
    const lineIds = Array.isArray(alert.lineIds) ? alert.lineIds.filter((id): id is string => typeof id === "string") : null
    const dayTypes = Array.isArray(alert.dayTypes)
      ? alert.dayTypes.filter((day): day is DayType => DAY_TYPES.includes(day as DayType))
      : null
    alerts.push({ stationId: alert.stationId, lineIds: someOrNull(lineIds), dayTypes: someOrNull(dayTypes) })
  }
  return alerts
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
    stationAlerts: normalizeStationAlerts(processedData),
    stationAlertsRegistered: processedData.stationAlertsRegistered ?? false,
    delayGuards: normalizeDelayGuards(processedData),
    delayGuardsRegistered: processedData.delayGuardsRegistered ?? false,
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
