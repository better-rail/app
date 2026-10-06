import type { ReactNode } from "react"
import { I18nManager, Platform, StyleSheet, type NativeSyntheticEvent, type ViewProps } from "react-native"
import { requireNativeViewManager, requireOptionalNativeModule } from "expo-modules-core"

/**
 * How wide a pane may be. A value of 1 or more is in points and below 1 a fraction of the arrangement's width; an
 * unset one is left to the system. Without room for both panes, the one with the lower `layoutPriority` is hidden.
 */
export type ArrangementPaneWidth = { minimum?: number; preferred?: number; maximum?: number; layoutPriority?: number }

export type ArrangementPaneFrame = { x: number; y: number; width: number; height: number }

/** Where the arrangement has put its panes, in its own (physical, left-to-right) coordinates. */
export type ArrangementLayout = {
  secondaryHidden: boolean
  primary?: ArrangementPaneFrame
  secondary?: ArrangementPaneFrame
}

const ArrangementModule = Platform.OS === "ios" ? requireOptionalNativeModule<{ isAvailable: boolean }>("Arrangement") : null

/** Whether `ArrangementView` lays its panes out with UIKit's arrangement controller (iOS 27.1 and later). */
export const isArrangementAvailable = ArrangementModule?.isAvailable ?? false

type NativeHostProps = ViewProps & {
  primaryWidth?: ArrangementPaneWidth
  secondaryWidth?: ArrangementPaneWidth
  onArrangementChange?: (event: NativeSyntheticEvent<ArrangementLayout>) => void
}

const NativeHost = isArrangementAvailable ? requireNativeViewManager<NativeHostProps>("Arrangement", "ArrangementHostView") : null
const NativePane = isArrangementAvailable
  ? requireNativeViewManager<ViewProps & { placement: "primary" | "secondary" }>("Arrangement", "ArrangementPaneView")
  : null

export interface ArrangementViewProps extends ViewProps {
  primary: ReactNode
  secondary: ReactNode
  primaryWidth?: ArrangementPaneWidth
  secondaryWidth?: ArrangementPaneWidth
  onArrangementChange?: (layout: ArrangementLayout) => void
}

/**
 * Two panes laid out by UIKit's `UIArrangementViewController`: side by side where there's room, either side of iPhone
 * Duo's fold when it's partially open, and the primary alone otherwise, with the system's animated transitions
 * between them as the device opens, folds and closes.
 *
 * Only available where `isArrangementAvailable`; check it and lay the panes out yourself elsewhere.
 */
export function ArrangementView({
  primary,
  secondary,
  primaryWidth,
  secondaryWidth,
  onArrangementChange,
  ...props
}: ArrangementViewProps) {
  if (!NativeHost || !NativePane) {
    throw new Error("ArrangementView needs iOS 27.1 or later; check isArrangementAvailable first.")
  }
  return (
    <NativeHost
      {...props}
      primaryWidth={primaryWidth}
      secondaryWidth={secondaryWidth}
      onArrangementChange={(event) => onArrangementChange?.(event.nativeEvent)}
    >
      {/* Keyed by placement: a pane's placement is fixed once it's in the arrangement. */}
      <NativePane key="primary" placement="primary" style={styles.pane}>
        {primary}
      </NativePane>
      <NativePane key="secondary" placement="secondary" style={styles.pane}>
        {secondary}
      </NativePane>
    </NativeHost>
  )
}

/** The leading pane's width and the gap to the trailing one — the fold, when partially folded — from a layout. */
export function arrangementColumns(layout: ArrangementLayout | null) {
  if (!layout || layout.secondaryHidden || !layout.primary || !layout.secondary) return null
  const { primary, secondary } = layout
  const gap = I18nManager.isRTL ? primary.x - (secondary.x + secondary.width) : secondary.x - (primary.x + primary.width)
  return { firstWidth: primary.width, gap: Math.max(0, gap) }
}

const styles = StyleSheet.create({
  // Each pane sits in its own view controller, at its origin; UIKit gives it its size (see ArrangementPaneView).
  // React Native swaps `left` and `right` under right-to-left, so the physical left edge is `right` there.
  pane: {
    position: "absolute",
    top: 0,
    ...(I18nManager.isRTL ? { right: 0 } : { left: 0 }),
  },
})
