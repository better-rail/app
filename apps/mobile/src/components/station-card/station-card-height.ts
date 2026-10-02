/**
 * Calculates responsive card height for station cards.
 *
 * For wide screens (tablets or unfolded foldables, width >= 600 or width > height),
 * scales height responsively based on width, capped between 125 and 175 (or 128 if short).
 *
 * For portrait phones, preserves the previous fixed screen-height thresholds
 * so standard phones (such as a 393px-wide device with screen height >= 680px)
 * retain their established card height instead of shrinking to 149px.
 */
export function getStationCardHeight(screenHeight: number, screenWidth?: number): number {
  if (screenWidth && (screenWidth >= 600 || screenWidth > screenHeight)) {
    return Math.round(Math.min(175, Math.max(125, screenHeight < 680 ? 128 : screenWidth * 0.38)))
  }

  if (screenHeight > 900) return 190
  if (screenHeight > 780) return 178.5
  if (screenHeight > 730) return 157.5
  if (screenHeight > 600) return 135
  return 120
}
