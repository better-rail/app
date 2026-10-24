import { useEffect, useRef, type ReactNode } from "react"
import { Platform } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Split, type SplitHostCommands } from "react-native-screens/experimental"
import { useShallow } from "zustand/react/shallow"
import { useSplitViewStore } from "./split-view-store"

interface AppSplitViewProps {
  /** The app's navigation stack: the primary column, and the whole interface while the split view is collapsed. */
  children: ReactNode
  /** The secondary column: the selected trip's details beside the route list, the favorite routes beside the planner. */
  pane: ReactNode
}

/**
 * Hosts the app in the system split view (UISplitViewController). Expanded — iPhone Duo's open inner display, an
 * iPad — the pane sits beside the app, either side of the fold when the device is partially folded. Collapsed — a
 * phone, the closed Duo — the app alone is shown, and the details column is pushed over it as a screen of its own
 * when the route list picks a trip, with the system's own push and pop gesture.
 *
 * Opening and closing the device is the split view's own collapse and expand: with a trip picked it carries the
 * details column between the push and the side-by-side layout, with the selection, scroll position and state intact;
 * without one the list stays where it is.
 *
 * The columns' own navigation bars are hidden (see the react-native-screens patch): each column's content brings its
 * own stack and bar, which the system lays out in iPhone Duo's vertical bar.
 *
 * Elsewhere than iOS the split view isn't available, so the app renders on its own and the route list opens the
 * route details screen.
 */
export function AppSplitView({ children, pane }: AppSplitViewProps) {
  const host = useRef<SplitHostCommands>(null)
  const { hasSelection, isRouteListMounted, columnRequest, setCollapsed } = useSplitViewStore(
    useShallow((s) => ({
      hasSelection: s.selection !== null,
      isRouteListMounted: s.isRouteListMounted,
      columnRequest: s.columnRequest,
      setCollapsed: s.setCollapsed,
    })),
  )

  // After the commit that put the trip in the column, so a push never starts on an empty one. Expanded, both columns
  // are on screen and this does nothing.
  useEffect(() => {
    if (columnRequest.n > 0) host.current?.show(columnRequest.column)
  }, [columnRequest])

  // The secondary column leaving the screen while the split view stays collapsed is the user going back from the
  // details (the back button or the pop gesture), which ends the selection. As the device closes with the column
  // beside the list, it disappears from its column and reappears pushed over the list within the same transition,
  // so the end of the selection is only called once it has stayed away.
  const secondaryOnScreen = useRef(false)
  const disappearance = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSecondaryWillAppear = () => {
    secondaryOnScreen.current = true
    if (disappearance.current) clearTimeout(disappearance.current)
    disappearance.current = null
  }
  const onSecondaryDidDisappear = () => {
    secondaryOnScreen.current = false
    if (disappearance.current) clearTimeout(disappearance.current)
    disappearance.current = setTimeout(() => {
      disappearance.current = null
      if (!secondaryOnScreen.current) useSplitViewStore.getState().clearSelection()
    }, 100)
  }

  if (Platform.OS !== "ios") return <>{children}</>

  return (
    <Split.Host
      // A callback: the host attaches its commands to a ref object only on its first mount, which is before this
      // component's (the ref object is then still empty).
      ref={(commands) => {
        host.current = commands
      }}
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
      preferredSplitBehavior="tile"
      preferredDisplayMode="oneBesideSecondary"
      displayModeButtonVisibility="never"
      showSecondaryToggleButton={false}
      presentsWithGesture={false}
      // Collapsing keeps what the user is looking at: the trip's details when one is picked, the app otherwise.
      topColumnForCollapsing={hasSelection && isRouteListMounted ? "secondary" : "primary"}
      columnMetrics={{
        preferredPrimaryColumnWidthOrFraction: 0.5,
        minimumPrimaryColumnWidth: 320,
        maximumPrimaryColumnWidth: 560,
      }}
    >
      {/* Each column gets its own safe area, so a screen only pads the edges its column actually reaches (e.g. the
          bar column on one side of iPhone Duo). */}
      <Split.Column>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </Split.Column>
      <Split.Column onWillAppear={onSecondaryWillAppear} onDidDisappear={onSecondaryDidDisappear}>
        <SafeAreaProvider>{pane}</SafeAreaProvider>
      </Split.Column>
    </Split.Host>
  )
}
