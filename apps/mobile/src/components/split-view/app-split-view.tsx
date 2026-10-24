import type { ReactNode } from "react"
import { Platform } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Split } from "react-native-screens/experimental"
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
 * phone, the closed Duo — only the app is shown, and the route list opens the route details screen on the app's own
 * stack, so the push, back button and swipe back are the system's.
 *
 * Opening and closing the device is the split view's own collapse and expand. A trip open at the time moves between
 * the route details screen and the details column (see the route list and the route details screen).
 *
 * The columns' own navigation bars are hidden (see the react-native-screens patch): each column's content brings its
 * own stack and bar, which the system lays out in iPhone Duo's vertical bar.
 *
 * Elsewhere than iOS the split view isn't available, so the app renders on its own.
 */
export function AppSplitView({ children, pane }: AppSplitViewProps) {
  const setCollapsed = useSplitViewStore((s) => s.setCollapsed)

  if (Platform.OS !== "ios") return <>{children}</>

  return (
    <Split.Host
      onCollapse={() => setCollapsed(true)}
      onExpand={() => setCollapsed(false)}
      preferredSplitBehavior="tile"
      preferredDisplayMode="oneBesideSecondary"
      displayModeButtonVisibility="never"
      showSecondaryToggleButton={false}
      presentsWithGesture={false}
      // Collapsed, the app's stack is the interface: the details column is never pushed over it.
      topColumnForCollapsing="primary"
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
      <Split.Column>
        <SafeAreaProvider>{pane}</SafeAreaProvider>
      </Split.Column>
    </Split.Host>
  )
}
