import { create } from "zustand"
import type { DelayGuard, RouteItem, Train } from "@/services/api"

/** What the Delay Guard sheet is about: a train from a route, or a guard already kept. */
export type DelayGuardDraft = Omit<DelayGuard, "thresholdMinutes"> & { thresholdMinutes?: number }

type NavigationParamsStore = {
  routeItem: RouteItem | null
  train: Train | null
  delayGuardDraft: DelayGuardDraft | null
  originId: string | null
  destinationId: string | null
  presentation: "modal" | "push" | null
  setRouteDetails: (params: { routeItem: RouteItem; originId: string; destinationId: string }) => void
  setRouteItem: (routeItem: RouteItem) => void
  setTrainInfo: (train: Train) => void
  setDelayGuardDraft: (draft: DelayGuardDraft) => void
  setPaywallPresentation: (presentation: "modal" | "push") => void
}

export const useNavigationParamsStore = create<NavigationParamsStore>((set) => ({
  routeItem: null,
  train: null,
  delayGuardDraft: null,
  originId: null,
  destinationId: null,
  presentation: null,
  setRouteDetails: ({ routeItem, originId, destinationId }) =>
    set({ routeItem, originId: String(originId), destinationId: String(destinationId) }),
  setRouteItem: (routeItem) => set({ routeItem }),
  setTrainInfo: (train) => set({ train }),
  setDelayGuardDraft: (delayGuardDraft) => set({ delayGuardDraft }),
  setPaywallPresentation: (presentation) => set({ presentation }),
}))
