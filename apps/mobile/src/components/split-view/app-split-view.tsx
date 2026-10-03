import type { ReactNode } from "react"
import { I18nManager, Platform, useWindowDimensions } from "react-native"
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context"
import { Split } from "react-native-screens/experimental"
import { useSplitViewStore } from "./split-view-store"

interface AppSplitViewProps {
  /** The app's navigation stack: the leading column, and all the split view shows when collapsed. */
  children: ReactNode
  /** The trailing column, shown beside the app only while the split view is expanded. */
  pane: ReactNode
}

/**
 * Hosts the app in the system split view (UISplitViewController), which lays the two columns out for the window
 * it's in: side by side on iPhone Duo's open inner display and iPads — either side of the fold when the device is
 * partially folded — and collapsed to the app alone on phones and the closed Duo, where it's a plain stack.
 * Column widths, the fold, safe areas and switching between the two follow the system, with no layout of our own.
 *
 * The app is the secondary (detail) column, as the system moves only the detail column's bar items into iPhone
 * Duo's vertical bar on the trailing edge (as it does for the whole app when the split view is collapsed), while a
 * primary column keeps its bars horizontal. The primary column, the pane, is put on the trailing edge, so the app
 * still leads and the pane sits beside it. (react-native-screens' Split is patched for this: the column views
 * follow the native split layout instead of React's, which under right-to-left put them out of their columns.)
 *
 * Elsewhere than iOS the split view isn't available, so the app renders on its own.
 */
export function AppSplitView({ children, pane }: AppSplitViewProps) {
  const setExpanded = useSplitViewStore((s) => s.setExpanded)

  // The split sits on the middle of the window, where the fold is when the device is partially folded, so folding
  // and unfolding move nothing. The pane's width is asked for in points, as a fraction is taken of the window minus
  // the bar insets, and without the bar's own inset: the system adds the trailing edge's inset (the vertical bar on
  // iPhone Duo) to the trailing column on top of the width asked for.
  const { width: windowWidth } = useWindowDimensions()
  const windowInsets = useSafeAreaInsets()
  const paneWidth = Math.max(320, Math.round(windowWidth / 2 - windowInsets.right))

  if (Platform.OS !== "ios") return <>{children}</>

  const appColumn = (
    <Split.Column>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </Split.Column>
  )
  const paneColumn = (
    <Split.Column
      // The pane is on screen exactly while the split view is expanded, so its appearance tracks the layout.
      onWillAppear={() => setExpanded(true)}
      onWillDisappear={() => setExpanded(false)}
    >
      <SafeAreaProvider>{pane}</SafeAreaProvider>
    </Split.Column>
  )

  return (
    <Split.Host
      preferredSplitBehavior="tile"
      preferredDisplayMode="oneBesideSecondary"
      displayModeButtonVisibility="never"
      showSecondaryToggleButton={false}
      presentsWithGesture={false}
      // The app keeps the left of the display and the pane, the primary column, takes the right, in both layout
      // directions; the edge is named for the layout direction.
      primaryEdge={I18nManager.isRTL ? "leading" : "trailing"}
      // Collapsed, the app is what's shown: the pane is only ever beside it, never a screen of its own.
      topColumnForCollapsing="secondary"
      // Without a secondary minimum of our own, the system's automatic one (over half the window on the Duo)
      // overrides the primary's width and the split lands off the fold.
      columnMetrics={{
        preferredPrimaryColumnWidthOrFraction: paneWidth,
        minimumPrimaryColumnWidth: 320,
        maximumPrimaryColumnWidth: paneWidth,
        minimumSecondaryColumnWidth: 320,
      }}
    >
      {/* Each column gets its own safe area, so a screen only pads the edges its column actually reaches (e.g. the
          bar column on one side of iPhone Duo). */}
      {paneColumn}
      {appColumn}
    </Split.Host>
  )
}
