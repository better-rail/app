import type { ReactNode } from "react"
import { Platform } from "react-native"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Split } from "react-native-screens/experimental"
import { useSplitViewStore } from "./split-view-store"

interface AppSplitViewProps {
  /** The app's navigation stack: the primary column, and all the split view shows when collapsed. */
  children: ReactNode
  /** The secondary column, shown beside the app only while the split view is expanded. */
  pane: ReactNode
}

/**
 * Hosts the app in the system split view (UISplitViewController), which lays the two columns out for the window
 * it's in: side by side on iPhone Duo's open inner display and iPads — either side of the fold when the device is
 * partially folded — and collapsed to the app alone on phones and the closed Duo, where it's a plain stack.
 * Column widths, the fold, safe areas and switching between the two follow the system, with no layout of our own.
 *
 * Elsewhere than iOS the split view isn't available, so the app renders on its own.
 */
export function AppSplitView({ children, pane }: AppSplitViewProps) {
  const setExpanded = useSplitViewStore((s) => s.setExpanded)

  if (Platform.OS !== "ios") return <>{children}</>

  return (
    <Split.Host
      preferredSplitBehavior="tile"
      preferredDisplayMode="oneBesideSecondary"
      displayModeButtonVisibility="never"
      showSecondaryToggleButton={false}
      presentsWithGesture={false}
      // Collapsed, the app is what's shown: the pane is only ever beside it, never a screen of its own.
      topColumnForCollapsing="primary"
      columnMetrics={{
        preferredPrimaryColumnWidthOrFraction: 0.5,
        minimumPrimaryColumnWidth: 320,
        maximumPrimaryColumnWidth: 600,
      }}
    >
      {/* Each column gets its own safe area, so a screen only pads the edges its column actually reaches (e.g. the
          bar column on one side of iPhone Duo). */}
      <Split.Column>
        <SafeAreaProvider>{children}</SafeAreaProvider>
      </Split.Column>
      <Split.Column
        // The pane is on screen exactly while the split view is expanded, so its appearance tracks the layout.
        onWillAppear={() => setExpanded(true)}
        onWillDisappear={() => setExpanded(false)}
      >
        <SafeAreaProvider>{pane}</SafeAreaProvider>
      </Split.Column>
    </Split.Host>
  )
}
