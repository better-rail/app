import { Dimensions } from "react-native"
import { create } from "zustand"
import type { RouteItem } from "@/services/api"
import { WIDE_LAYOUT_MIN_WIDTH } from "@/hooks/use-is-wide-layout"

export type SplitViewSelection = { route: RouteItem; originId: string; destinationId: string }

type SplitViewColumn = "primary" | "secondary"

type SplitViewStore = {
  /**
   * Whether the split view shows one column at a time (a phone, the closed iPhone Duo), so the details column is a
   * screen pushed over the list, or both side by side (the open Duo, an iPad).
   */
  isCollapsed: boolean
  /**
   * Whether the route list is on the app's stack, so the details column shows the selected trip: beside the list
   * when the split view is expanded, and pushed over it, as a screen of its own, when it's collapsed.
   */
  isRouteListMounted: boolean
  /** The trip the route list has picked for the details column. */
  selection: SplitViewSelection | null
  showEntireRoute: boolean
  /** A column asked to be shown, numbered so the same column can be asked for again; the split view host acts on it. */
  columnRequest: { column: SplitViewColumn; n: number }
  setCollapsed: (isCollapsed: boolean) => void
  setRouteListMounted: (isRouteListMounted: boolean) => void
  /** Picks a trip for the details column and, collapsed, brings the column on screen. */
  showDetails: (selection: SplitViewSelection) => void
  /** Collapsed, goes back from the details column to the list. */
  showList: () => void
  clearSelection: () => void
  setShowEntireRoute: React.Dispatch<React.SetStateAction<boolean>>
}

/**
 * Whether the split view is collapsed in a window this wide: below the width the two columns fit side by side, its
 * host is told its width is compact (see the react-native-screens patch), and a compact split view collapses.
 */
const isCollapsedAtWidth = (width: number) => width < WIDE_LAYOUT_MIN_WIDTH

export const useSplitViewStore = create<SplitViewStore>((set) => ({
  isCollapsed: isCollapsedAtWidth(Dimensions.get("window").width),
  isRouteListMounted: false,
  selection: null,
  showEntireRoute: false,
  columnRequest: { column: "primary", n: 0 },
  setCollapsed: (isCollapsed) => set({ isCollapsed }),
  // The trip stays up as the list leaves, so the pane can fade it out; a new list clears it itself.
  setRouteListMounted: (isRouteListMounted) => set({ isRouteListMounted }),
  // A new selection starts from the trip's own stations, as opening the route details screen does.
  showDetails: (selection) =>
    set((state) => ({
      selection,
      showEntireRoute: false,
      columnRequest: { column: "secondary", n: state.columnRequest.n + 1 },
    })),
  showList: () => set((state) => ({ columnRequest: { column: "primary", n: state.columnRequest.n + 1 } })),
  clearSelection: () => set({ selection: null }),
  setShowEntireRoute: (value) =>
    set((state) => ({ showEntireRoute: typeof value === "function" ? value(state.showEntireRoute) : value })),
}))

// Opening or closing the device resizes the window, and the split view collapses or expands with it. Taken from the
// window itself, the details column changes its layout in the very render that lays it out for the new display; the
// split view's own collapse and expand events (see AppSplitView) follow a few frames later and confirm it.
Dimensions.addEventListener("change", ({ window }) =>
  useSplitViewStore.getState().setCollapsed(isCollapsedAtWidth(window.width)),
)
