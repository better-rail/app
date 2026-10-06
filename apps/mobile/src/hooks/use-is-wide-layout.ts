import { useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** Usable width (after the side safe-area insets) from which screens lay out in two columns. */
export const WIDE_LAYOUT_MIN_WIDTH = 700

/**
 * Whether the window has room for a two-column layout — iPhone Duo's open inner display, or an iPad. React
 * Native doesn't expose size classes, so this follows the width actually available, which also tracks folding,
 * rotation and Split View resizing.
 */
export function useIsWideLayout() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  return width - insets.left - insets.right >= WIDE_LAYOUT_MIN_WIDTH
}
