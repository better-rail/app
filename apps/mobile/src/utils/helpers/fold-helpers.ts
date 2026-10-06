export type Region = { x: number; y: number; width: number; height: number }

/** The narrowest either column may get before the fold is ignored in favour of the regular split. */
const MIN_COLUMN_WIDTH = 240

/**
 * Splits a row into two columns on either side of a vertical fold (iPhone Duo partially open, like a book), keeping
 * both clear of it. `divisions` are the row's active division regions, in its (physical, left-to-right) coordinate
 * space; the row pads its start by `startInset`. The first column sits at the row's start — its right in RTL.
 *
 * Returns the first column's width and the gap to leave before the second, or `null` without a usable vertical fold.
 */
export function splitAroundFold(rowWidth: number, divisions: Region[], isRTL: boolean, startInset: number) {
  const fold = divisions.find((region) => region.height > region.width)
  if (!fold) return null

  const leftOfFold = fold.x
  const rightOfFold = rowWidth - (fold.x + fold.width)
  const firstColumnWidth = (isRTL ? rightOfFold : leftOfFold) - startInset
  const secondColumnWidth = isRTL ? leftOfFold : rightOfFold
  if (firstColumnWidth < MIN_COLUMN_WIDTH || secondColumnWidth < MIN_COLUMN_WIDTH) return null

  return { firstColumnWidth, gap: fold.width }
}
