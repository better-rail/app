import { create } from "zustand"
import type { RouteItem } from "@/services/api"

export type SplitViewSelection = { route: RouteItem; originId: string; destinationId: string }

type SplitViewStore = {
  /**
   * Whether the system split view is showing the side pane beside the app — on iPhone Duo's open inner display
   * or an iPad. Folded, closed or on a phone, the split view collapses to the app alone.
   */
  isExpanded: boolean
  /**
   * Whether the route list is on the app's stack, so the pane shows the selected trip's details: beside the list
   * itself, and still while a sheet or the details screen sits on top of it.
   */
  isRouteListMounted: boolean
  /** The trip the route list has picked for the side pane to show while the split view is expanded. */
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  setExpanded: (isExpanded: boolean) => void
  setRouteListMounted: (isRouteListMounted: boolean) => void
  setSelection: (selection: SplitViewSelection | null) => void
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  isExpanded: false,
  isRouteListMounted: false,
  selection: null,
  showEntireRoute: false,
  // The selection outlives a collapse: the route list opens the trip's details screen as the device closes, and the
  // pane picks the trip up again as it opens.
  setExpanded: (isExpanded) => set({ isExpanded }),
  setRouteListMounted: (isRouteListMounted) => set({ isRouteListMounted }),
  // A new selection starts from the trip's own stations, as opening the route details screen does.
  setSelection: (selection) => set({ selection, showEntireRoute: false }),
  setShowEntireRoute: (value) =>
    set((state) => ({ showEntireRoute: typeof value === "function" ? value(state.showEntireRoute) : value })),
}))
