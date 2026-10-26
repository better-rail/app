import type { ChartBucket } from "./compute-stats"

export const CHART_HEIGHT = 120
export const MIN_BAR_HEIGHT = 4
export const MAX_BAR_WIDTH = 28
export const BAR_RADIUS = 4
export const DASH_WIDTH = 4
export const LINE_WIDTH = 1.5

export type ChartBarsProps = {
  buckets: ChartBucket[]
  max: number
  /** Width of the plot, measured by the chart */
  width: number
  /** The scrubbed bar; the others dim while it's set */
  selected?: number
  /** Height of the dashed average line, undefined to hide it */
  averageHeight?: number
  /** Changes with the period, so a new set of bars grows in instead of morphing from unrelated ones */
  layoutKey: string
}

export const barGap = (count: number) => (count > 14 ? 2 : 6)

export const barHeight = (bucket: ChartBucket, max: number) =>
  bucket.value ? Math.max(MIN_BAR_HEIGHT, (bucket.value / max) * CHART_HEIGHT) : MIN_BAR_HEIGHT

export const isEmptyBar = (bucket: ChartBucket) => bucket.future || !bucket.value

/** Bars dim around the scrubbed one, and the unfinished current bar stays half-faded */
export function barOpacity(bucket: ChartBucket, index: number, selected: number | undefined) {
  if (selected !== undefined) return index === selected ? 1 : 0.35
  return bucket.current && !isEmptyBar(bucket) ? 0.5 : 1
}
