import { Dimensions } from "react-native"
import { create } from "zustand"
import type { RouteItem } from "@/services/api"
import { WIDE_LAYOUT_MIN_WIDTH } from "@/hooks/use-is-wide-layout"

export type SplitViewSelection = { route: RouteItem; originId: string; destinationId: string }

type SplitViewStore = {
  /**
   * Whether the split view shows only the app (a phone, the closed iPhone Duo), where a trip opens the route details
   * screen, or the details column beside it (the open Duo, an iPad).
   */
  isCollapsed: boolean
  /** Whether the route list is on the app's stack, so the details column shows the selected trip beside it. */
  isRouteListMounted: boolean
  /** The trip the route list has picked for the details column. */
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  setCollapsed: (isCollapsed: boolean) => void
  setRouteListMounted: (isRouteListMounted: boolean) => void
  /** Picks a trip for the details column. */
  showDetails: (selection: SplitViewSelection) => void
  clearSelection: () => void
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  // Until the split view first reports, a narrow window is taken as collapsed.
  isCollapsed: Dimensions.get("window").width < WIDE_LAYOUT_MIN_WIDTH,
  isRouteListMounted: false,
  selection: null,
  showEntireRoute: false,
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
  // The trip stays up as the list leaves, so the pane can fade it out; a new list clears it itself.
  setRouteListMounted: (isRouteListMounted) => set({ isRouteListMounted }),
  // A new selection starts from the trip's own stations, as opening the route details screen does.
  showDetails: (selection) => set({ selection, showEntireRoute: false }),
  clearSelection: () => set({ selection: null }),
  setShowEntireRoute: (value) =>
    set((state) => ({ showEntireRoute: typeof value === "function" ? value(state.showEntireRoute) : value })),
}))
