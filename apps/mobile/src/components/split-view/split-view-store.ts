import { create } from "zustand"
import type { RouteItem } from "@/services/api"

export type SplitViewSelection = { route: RouteItem; originId: string; destinationId: string }

type SplitViewStore = {
  /**
   * Whether the route list is on the app's stack, so the details column shows the selected trip: beside the list
   * when the split view is expanded, and pushed over it, as a screen of its own, when it's collapsed.
   */
  isRouteListMounted: boolean
  /** The trip the route list has picked for the details column. */
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  /** Bumped each time the route list asks for the details column to be shown; the split view host acts on it. */
  showDetailsRequest: number
  setRouteListMounted: (isRouteListMounted: boolean) => void
  /** Picks a trip for the details column and, collapsed, brings the column on screen. */
  showDetails: (selection: SplitViewSelection) => void
  clearSelection: () => void
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  isRouteListMounted: false,
  selection: null,
  showEntireRoute: false,
  showDetailsRequest: 0,
  setRouteListMounted: (isRouteListMounted) =>
    // Leaving the list drops its trip, so the column is empty next time the list is opened.
    set(isRouteListMounted ? { isRouteListMounted } : { isRouteListMounted, selection: null }),
  // A new selection starts from the trip's own stations, as opening the route details screen does.
  showDetails: (selection) =>
    set((state) => ({ selection, showEntireRoute: false, showDetailsRequest: state.showDetailsRequest + 1 })),
  clearSelection: () => set({ selection: null }),
  setShowEntireRoute: (value) =>
    set((state) => ({ showEntireRoute: typeof value === "function" ? value(state.showEntireRoute) : value })),
}))
