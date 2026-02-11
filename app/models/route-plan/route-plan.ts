import { create } from "zustand"
import { NativeModules, Platform } from "react-native"
import { translate } from "../../i18n"

const { RNBetterRail } = NativeModules

// Saves the current route to iOS App Group
// Later it'll be used by the widget as the initial route
function sendCurrentRouteToiOS(originId: string, destinationId: string) {
  if (Platform.OS === "ios" && originId && destinationId) {
    RNBetterRail.saveCurrentRoute(originId, destinationId)
  }
}

export type DateType = "departure" | "arrival"

export type Station = {
  id: string
  name: string
}

export interface RoutePlanState {
  origin: Station | undefined
  destination: Station | undefined
  date: Date
  dateType: DateType
}

export interface RoutePlanActions {
  setOrigin: (station: Station | undefined) => void
  setDestination: (station: Station | undefined) => void
  setDate: (date: Date) => void
  setDateType: (type: DateType) => void
  switchDirection: () => void
}

export type RoutePlanStore = RoutePlanState & RoutePlanActions

export const useRoutePlanStore = create<RoutePlanStore>((set, get) => ({
  origin: undefined,
  destination: undefined,
  date: new Date(),
  dateType: "departure",

  setOrigin(station) {
    set({ origin: station })
    const dest = get().destination
    sendCurrentRouteToiOS(station?.id, dest?.id)
  },

  setDestination(station) {
    set({ destination: station })
    const orig = get().origin
    sendCurrentRouteToiOS(orig?.id, station?.id)
  },

  setDate(date) {
    set({ date })
  },

  setDateType(type) {
    set({ dateType: type })
  },

  switchDirection() {
    const { origin, destination } = get()
    const newOrigin = destination ? { ...destination } : undefined
    const newDestination = origin ? { ...origin } : undefined
    set({ origin: newOrigin, destination: newDestination })
    sendCurrentRouteToiOS(newOrigin?.id, newDestination?.id)
  },

}))

export function useDateTypeDisplayName() {
  const dateType = useRoutePlanStore((s) => s.dateType)
  return dateType === "departure" ? translate("plan.leaveAt") : translate("plan.arriveAt")
}

// Snapshot helpers for persistence - exclude date and dateType from persistence
export function getRoutePlanSnapshot(state: RoutePlanState) {
  const { date, dateType, ...rest } = state
  return {
    origin: rest.origin ? { ...rest.origin } : undefined,
    destination: rest.destination ? { ...rest.destination } : undefined,
  }
}

export function hydrateRoutePlanStore(data: any) {
  if (!data) return
  useRoutePlanStore.setState({
    origin: data.origin ?? undefined,
    destination: data.destination ?? undefined,
    // Always start with fresh date and default dateType
    date: new Date(),
    dateType: "departure",
  })
}

export type { Station as RoutePlanStation }
