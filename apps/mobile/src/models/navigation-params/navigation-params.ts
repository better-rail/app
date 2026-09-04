import { create } from "zustand"
import type { RouteItem, Train } from "@/services/api"

type NavigationParamsStore = {
  routeItem: RouteItem | null
  train: Train | null
  originId: string | null
  destinationId: string | null
  presentation: "modal" | "push" | null
  setRouteDetails: (params: { routeItem: RouteItem; originId: string; destinationId: string }) => void
  setRouteItem: (routeItem: RouteItem) => void
  setTrainInfo: (train: Train) => void
  setPaywallPresentation: (presentation: "modal" | "push") => void
}

export const useNavigationParamsStore = create<NavigationParamsStore>((set) => ({
  routeItem: null,
  train: null,
  originId: null,
  destinationId: null,
  presentation: null,
  setRouteDetails: ({ routeItem, originId, destinationId }) =>
    set({ routeItem, originId: String(originId), destinationId: String(destinationId) }),
  setRouteItem: (routeItem) => set({ routeItem }),
  setTrainInfo: (train) => set({ train }),
  setPaywallPresentation: (presentation) => set({ presentation }),
}))
