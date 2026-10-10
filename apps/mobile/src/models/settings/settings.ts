import { create } from "zustand"
import { DAY_TYPES, type DayType } from "@/data/rail-service-patterns"
import { DEFAULT_GUARD_MINUTES, type DelayGuard, GUARD_MINUTES_OPTIONS, type PopUpMessage, guardKey } from "@/services/api"

export type { DelayGuard }

export type MaxChanges = 0 | 1 | null
export type ColorSchemePreference = "automatic" | "light" | "dark"
export const TRAIN_INFO_PROMPT_SEARCH_THRESHOLD = 2

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
  /** The rider's Israel Railways fare profile id (0 = general), shown on the fares sheet. */
  profileCode: number
  totalTip: number
  recordedTipTransactionIds: string[]
  showRouteCardHeader: boolean
  showHourIndex: boolean
  colorScheme: ColorSchemePreference
  hideSlowTrains: boolean
  maxChanges: MaxChanges
  trainSearchCount: number
  seenTrainInfoPrompt: boolean
  seenLawsuitAnnouncement: boolean
  stationAlerts: StationAlert[]
  /**
   * The push token the server holds this device's subscription under (null: none), so an emptied
   * list, a revoked permission or a new token can still be told to it. "" is a subscription made
   * by an older build, whose token was not kept: the current one is assumed.
   */
  stationAlertsToken: string | null
  /** Trains to be told about when they run late (Delay Notifications). */
  delayGuards: DelayGuard[]
  delayGuardsToken: string | null
}

export interface SettingsActions {
  setProfileCode: (code: number) => void
  recordTip: (transactionId: string, amount: number) => void
  setShowRouteCardHeader: (show: boolean) => void
  setShowHourIndex: (show: boolean) => void
  setColorScheme: (colorScheme: ColorSchemePreference) => void
  setHideSlowTrains: (hide: boolean) => void
  setMaxChanges: (maxChanges: MaxChanges) => void
  recordTrainSearch: () => void
  setSeenUrgentMessagesIds: (messagesIds: number[]) => void
  setSeenTrainInfoPrompt: (seen: boolean) => void
  setSeenLawsuitAnnouncement: (seen: boolean) => void
  /** Adds the station (every line, always), or changes the lines or days of one already there. */
  setStationAlert: (stationId: string, choice?: Partial<Omit<StationAlert, "stationId">>) => void
  removeStationAlert: (stationId: string) => void
  setStationAlertsToken: (token: string | null) => void
  /** Adds the guard, or changes one already there (same train and boarding station). */
  setDelayGuard: (guard: DelayGuard) => void
  removeDelayGuard: (key: string) => void
  setDelayGuardsToken: (token: string | null) => void
}

export type SettingsStore = SettingsState & SettingsActions

// Israel Railways' "general" profile. The retired fares feature stored 1 for it,
// an id the rail API never lists — hydration maps that onto 0.
const GENERAL_PROFILE_CODE = 0
const migrateProfileCode = (code: unknown): number => (typeof code === "number" && code !== 1 ? code : GENERAL_PROFILE_CODE)

const initialSettingsState: SettingsState = {
  seenUrgentMessagesIds: [],
  profileCode: GENERAL_PROFILE_CODE,
  totalTip: 0,
  recordedTipTransactionIds: [],
  showRouteCardHeader: false,
  showHourIndex: false,
  colorScheme: "automatic",
  hideSlowTrains: false,
  maxChanges: null,
  trainSearchCount: 0,
  seenTrainInfoPrompt: false,
  seenLawsuitAnnouncement: false,
  stationAlerts: [],
  stationAlertsToken: null,
  delayGuards: [],
  delayGuardsToken: null,
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

  setShowHourIndex(show) {
    set({ showHourIndex: show })
  },

  setColorScheme(colorScheme) {
    set({ colorScheme })
  },

  setHideSlowTrains(hide) {
    set({ hideSlowTrains: hide })
  },

  setMaxChanges(maxChanges) {
    set({ maxChanges })
  },

  recordTrainSearch() {
    if (get().trainSearchCount >= TRAIN_INFO_PROMPT_SEARCH_THRESHOLD) return
    set((state) => ({ trainSearchCount: state.trainSearchCount + 1 }))
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

  setStationAlertsToken(token) {
    set({ stationAlertsToken: token })
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

  setDelayGuardsToken(token) {
    set({ delayGuardsToken: token })
  },
}))

/** How many route filters the user has turned on — the toolbar shows the number, not just that one is on. */
export const activeFilterCount = (state: Pick<SettingsState, "hideSlowTrains" | "maxChanges">): number =>
  (state.hideSlowTrains ? 1 : 0) + (state.maxChanges !== null ? 1 : 0)

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
    showHourIndex: state.showHourIndex,
    colorScheme: state.colorScheme,
    hideSlowTrains: state.hideSlowTrains,
    maxChanges: state.maxChanges,
    trainSearchCount: state.trainSearchCount,
    seenTrainInfoPrompt: state.seenTrainInfoPrompt,
    seenLawsuitAnnouncement: state.seenLawsuitAnnouncement,
    stationAlerts: state.stationAlerts,
    stationAlertsToken: state.stationAlertsToken,
    delayGuards: state.delayGuards,
    delayGuardsToken: state.delayGuardsToken,
  }
}

/** The token a subscription is held under, as persisted; an older build's `…Registered: true` kept none (""). */
export function normalizeRegisteredToken(token: unknown, legacyRegistered: unknown): string | null {
  if (typeof token === "string") return token
  return legacyRegistered === true ? "" : null
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

  const persistedTrainSearchCount = processedData.trainSearchCount
  const trainSearchCount =
    Number.isSafeInteger(persistedTrainSearchCount) && persistedTrainSearchCount >= 0
      ? Math.min(persistedTrainSearchCount, TRAIN_INFO_PROMPT_SEARCH_THRESHOLD)
      : 0

  useSettingsStore.setState({
    seenUrgentMessagesIds: processedData.seenUrgentMessagesIds ?? [],
    profileCode: migrateProfileCode(processedData.profileCode),
    totalTip: processedData.totalTip ?? 0,
    recordedTipTransactionIds: processedData.recordedTipTransactionIds ?? [],
    showRouteCardHeader: processedData.showRouteCardHeader ?? false,
    showHourIndex: processedData.showHourIndex ?? false,
    colorScheme: ["automatic", "light", "dark"].includes(processedData.colorScheme) ? processedData.colorScheme : "automatic",
    hideSlowTrains: processedData.hideSlowTrains ?? false,
    maxChanges: processedData.maxChanges ?? null,
    trainSearchCount,
    seenTrainInfoPrompt: processedData.seenTrainInfoPrompt ?? false,
    seenLawsuitAnnouncement: processedData.seenLawsuitAnnouncement ?? false,
    stationAlerts: normalizeStationAlerts(processedData),
    stationAlertsToken: normalizeRegisteredToken(processedData.stationAlertsToken, processedData.stationAlertsRegistered),
    delayGuards: normalizeDelayGuards(processedData),
    delayGuardsToken: normalizeRegisteredToken(processedData.delayGuardsToken, processedData.delayGuardsRegistered),
  })
}
