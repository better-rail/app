/**
 * All screen keyboard offsets.
 */
export const offsets = {
  none: 0,
}

/**
 * The variations of keyboard offsets.
 */
export type KeyboardOffsets = keyof typeof offsets

/**
 * The variations of screens.
 *
 * The preset styles themselves live in `screen.tsx` as a theme-aware Unistyles stylesheet.
 */
export type ScreenPresets = "fixed" | "scroll"

/**
 * Is this preset a non-scrolling one?
 *
 * @param preset The preset to check
 */
export function isNonScrolling(preset?: ScreenPresets) {
  // Anything that isn't explicitly "scroll" (including undefined/empty/unknown) is non-scrolling.
  return preset !== "scroll"
}
