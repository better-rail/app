import { create } from "zustand"
import type { RouteItem } from "@/services/api"

export type SplitViewSelection = { route: RouteItem; originId: string; destinationId: string }

type SplitViewStore = {
  /**
   * Whether the system split view is showing the side pane beside the app — on iPhone Duo's open inner display
   * or an iPad. Folded, closed or on a phone, the split view collapses to the app alone.
   */
  isExpanded: boolean
  /** The trip the route list has picked for the side pane to show while the split view is expanded. */
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  setExpanded: (isExpanded: boolean) => void
  setSelection: (selection: SplitViewSelection | null) => void
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
}

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  isExpanded: false,
  selection: null,
  showEntireRoute: false,
  // Collapsed, the pane is off screen, so drop its trip rather than keep it fresh for nobody.
  setExpanded: (isExpanded) => set(isExpanded ? { isExpanded } : { isExpanded, selection: null }),
  // A new selection starts from the trip's own stations, as opening the route details screen does.
  setSelection: (selection) => set({ selection, showEntireRoute: false }),
  setShowEntireRoute: (value) =>
    set((state) => ({ showEntireRoute: typeof value === "function" ? value(state.showEntireRoute) : value })),
}))
