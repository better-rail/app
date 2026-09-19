import { create } from "zustand"
import type { RouteItem, Train } from "@/services/api"

type NavigationParamsStore = {
  routeItem: RouteItem | null
  train: Train | null
  originId: string | null
  destinationId: string | null
  presentation: "modal" | "push" | null
  /**
   * A trip the route details screen hands back to the route list when the window widens (the device opens or
   * rotates), for the list to show in its split view in place of the screen.
   */
  splitHandoff: RouteItem | null
  setRouteDetails: (params: { routeItem: RouteItem; originId: string; destinationId: string }) => void
  setRouteItem: (routeItem: RouteItem) => void
  setTrainInfo: (train: Train) => void
  setPaywallPresentation: (presentation: "modal" | "push") => void
  setSplitHandoff: (routeItem: RouteItem | null) => void
}

export const useNavigationParamsStore = create<NavigationParamsStore>((set) => ({
  routeItem: null,
  train: null,
  originId: null,
  destinationId: null,
  presentation: null,
  splitHandoff: null,
  setRouteDetails: ({ routeItem, originId, destinationId }) =>
    set({ routeItem, originId: String(originId), destinationId: String(destinationId) }),
  setRouteItem: (routeItem) => set({ routeItem }),
  setTrainInfo: (train) => set({ train }),
  setPaywallPresentation: (presentation) => set({ presentation }),
  setSplitHandoff: (splitHandoff) => set({ splitHandoff }),
}))
