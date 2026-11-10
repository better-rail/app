import React, { useMemo, useRef, useState } from "react"
import { View, type LayoutChangeEvent } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import HapticFeedback from "react-native-haptic-feedback"
import { format } from "date-fns"
import { Text } from "@/components"
import { dateFnsLocalization, isRTL, translate, userLocale, type TxKeyPath } from "@/i18n"
import type { RideRecord } from "@/models"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { metricChart, type ChartUnit, type HistoryMetric, type HistoryPeriod } from "./compute-stats"
import { statsPalette } from "./statistics-palette"
import { NumericText } from "./numeric-text"
import { ChartBars } from "./chart-bars"
import { CHART_HEIGHT, barGap } from "./chart-bars.types"
import { formatMetric } from "./ride-format"

const averageLabel: Record<ChartUnit, TxKeyPath> = {
  day: "statistics.chartAverageDay",
  month: "statistics.chartAverageMonth",
  year: "statistics.chartAverageYear",
}

function formatAverage(metric: HistoryMetric, value: number | undefined) {
  if (value === undefined) return "–"
  if (metric === "distance") return formatMetric(metric, value)
  if (metric === "onTime") return `${Math.round(value)}%`
  return value.toLocaleString(userLocale, { maximumFractionDigits: value < 10 ? 1 : 0 })
}

const unitLabel: Record<HistoryMetric, TxKeyPath> = {
  rides: "statistics.rides",
  hours: "statistics.hoursOnTrain",
  distance: "statistics.kmUnit",
  onTime: "statistics.legendOnTime",
}

/** The scrubbed bucket's date */
function bucketLabel(unit: ChartUnit, start: number) {
  const pattern = unit === "day" ? "EEE, d MMM" : unit === "month" ? "MMMM yyyy" : "yyyy"
  return format(start, pattern, { locale: dateFnsLocalization })
}

/** Which buckets get an axis label, and how it reads */
function axisLabel(unit: ChartUnit, period: HistoryPeriod, index: number, count: number, start: number) {
  const date = (pattern: string) => format(start, pattern, { locale: dateFnsLocalization })
  if (unit === "year") return date("yyyy")
  if (period === "week") return date("EEEEE")
  if (period === "month") return index % 7 === 0 ? date("d") : undefined
  if (count <= 12) return date("MMMMM")
  return index % 3 === 0 ? date("MMM") : undefined
}

/** Bars of the selected metric across the period, with a dashed average line */
export function MetricChart({ rides, period, metric }: { rides: RideRecord[]; period: HistoryPeriod; metric: HistoryMetric }) {
  const { unit, buckets, average } = useMemo(() => metricChart(rides, period, metric), [rides, period, metric])
  const [width, setWidth] = useState(0)
  const max = metric === "onTime" ? 100 : Math.max(average ?? 0, ...buckets.map((bucket) => bucket.value ?? 0)) || 1
  const averageHeight = average ? (average / max) * CHART_HEIGHT : undefined
  const legend = translate(metric === "onTime" ? "statistics.chartOverall" : averageLabel[unit])
  const averageText = formatAverage(metric, average)

  // Scrubbing: a horizontal drag, or a long press then any drag, picks the bar under the finger
  const [selected, setSelected] = useState<number>()
  const lastSelected = useRef<number | undefined>(undefined)
  const selectAt = (x: number) => {
    const slot = (width + barGap(buckets.length)) / buckets.length
    const position = Math.min(buckets.length - 1, Math.max(0, Math.floor(x / slot)))
    const index = isRTL ? buckets.length - 1 - position : position
    if (index === lastSelected.current) return
    lastSelected.current = index
    HapticFeedback.trigger("selection")
    setSelected(index)
  }
  const clearSelection = () => {
    lastSelected.current = undefined
    setSelected(undefined)
  }
  const scrub = (pan: ReturnType<typeof Gesture.Pan>) =>
    pan
      .runOnJS(true)
      .onStart((event) => selectAt(event.x))
      .onUpdate((event) => selectAt(event.x))
      .onFinalize(clearSelection)
  const gesture = Gesture.Race(
    scrub(Gesture.Pan().activeOffsetX([-6, 6]).failOffsetY([-12, 12])),
    scrub(Gesture.Pan().activateAfterLongPress(250)),
  )
  const selectedBucket = selected === undefined ? undefined : buckets[selected]

  return (
    <View style={styles.card} accessible accessibilityLabel={`${legend} ${averageText}`}>
      <View style={styles.legend}>
        {selectedBucket ? (
          <Text style={styles.legendText}>{bucketLabel(unit, selectedBucket.start)}</Text>
        ) : (
          <>
            <View style={styles.legendDash}>
              <View style={styles.dash} />
              <View style={styles.dash} />
            </View>
            <Text style={styles.legendText}>{legend}</Text>
          </>
        )}
        <NumericText value={selectedBucket ? selectedBucket.value : average} style={styles.legendValue}>
          {selectedBucket ? formatMetric(metric, selectedBucket.value) : averageText}
        </NumericText>
        {selectedBucket && metric !== "distance" && (
          <Text style={styles.legendText}>{translate(unitLabel[metric])?.toLocaleLowerCase(userLocale)}</Text>
        )}
      </View>

      <GestureDetector gesture={gesture}>
        <View style={styles.plot} onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
          <ChartBars
            buckets={buckets}
            max={max}
            width={width}
            selected={selected}
            averageHeight={averageHeight}
            layoutKey={period}
          />
        </View>
      </GestureDetector>

      <View style={[styles.axis, { gap: barGap(buckets.length) }]}>
        {buckets.map((bucket, index) => (
          <View key={bucket.start} style={styles.axisCell}>
            <Text style={[styles.axisText, bucket.current && styles.axisTextCurrent]} numberOfLines={1}>
              {axisLabel(unit, period, index, buckets.length, bucket.start)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const cardRadius = isLiquidGlassSupported ? 22 : 16

const styles = StyleSheet.create((theme) => ({
  card: {
    marginTop: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    marginBottom: theme.spacing[4],
  },
  legendDash: {
    flexDirection: "row",
    gap: 3,
  },
  dash: {
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: statsPalette.orange,
  },
  legendText: {
    color: statsPalette.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  legendValue: {
    color: statsPalette.text,
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  plot: {
    height: CHART_HEIGHT,
  },
  axis: {
    flexDirection: "row",
    marginTop: theme.spacing[2],
  },
  axisCell: {
    flex: 1,
    alignItems: "center",
  },
  axisText: {
    width: 40,
    textAlign: "center",
    color: statsPalette.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  axisTextCurrent: {
    color: statsPalette.text,
  },
}))
