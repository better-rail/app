import { useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * Whether the window has room for a two-column layout — iPhone Duo's open inner display, or an iPad. React
 * Native doesn't expose size classes, so this follows the width actually available, which also tracks folding,
 * rotation and Split View resizing. On iOS 27.1+ the two-column screens let UIKit's arrangement decide instead (see
 * modules/arrangement); this is their first guess until it reports, and the decision elsewhere.
 */
export function useIsWideLayout() {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  return width - insets.left - insets.right >= WIDE_LAYOUT_MIN_WIDTH
}
