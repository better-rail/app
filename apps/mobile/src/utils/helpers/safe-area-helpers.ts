/**
 * Safe-area insets are physical: on iPhone Duo the status bar, camera and navigation bar sit on
 * one hardware edge and stay there in right-to-left languages. React Native swaps left and right
 * styles under RTL, so a physical inset has to be mapped onto a logical start/end side.
 */
export function logicalSideInsets(insets: { left: number; right: number }, isRTL: boolean) {
  return {
    start: isRTL ? insets.right : insets.left,
    end: isRTL ? insets.left : insets.right,
  }
}

/** Start/end padding that clears both side insets, plus `extra` on each side. */
export function sideInsetPadding(insets: { left: number; right: number }, isRTL: boolean, extra = 0) {
  const { start, end } = logicalSideInsets(insets, isRTL)
  return { paddingStart: start + extra, paddingEnd: end + extra }
}
