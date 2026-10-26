import React, { useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { FlashList } from "@shopify/flash-list"
import HapticFeedback from "react-native-haptic-feedback"
import TouchableScale from "react-native-touchable-scale"
import { useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import { format, isThisYear } from "date-fns"
import { Text } from "@/components"
import { StatsBackground } from "./stats-screen"
import { stationLocale, stationsObject } from "@/data/stations"
import { dateFnsLocalization, isRTL, translate, type TxKeyPath } from "@/i18n"
import { useRideHistoryStore, type RideRecord } from "@/models"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import {
  ON_TIME_THRESHOLD_MINUTES,
  metricValue,
  rideHistoryItems,
  ridesInPeriod,
  type HistoryItem,
  type HistoryMetric,
  type HistoryPeriod,
} from "./compute-stats"
import { statsNumberFont, statsPalette } from "./statistics-palette"
import { formatMetric, rideDuration } from "./ride-format"
import { MetricChart } from "./metric-chart"
import { NumericText } from "./numeric-text"

const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""

const STOP_SPACING = 14

const METRICS: { metric: HistoryMetric; label: TxKeyPath; icon: string }[] = [
  { metric: "rides", label: "statistics.rides", icon: "🎫" },
  { metric: "hours", label: "statistics.hoursOnTrain", icon: "⏱️" },
  { metric: "onTime", label: "statistics.legendOnTime", icon: "🎯" },
]

const selectionHaptic = () => HapticFeedback.trigger("selection")

export function RideHistoryScreen() {
  const rides = useRideHistoryStore((state) => state.rides)
  const [metric, setMetric] = useState<HistoryMetric>("rides")
  const [period, setPeriod] = useState<HistoryPeriod>("all")
  const visibleRides = useMemo(() => ridesInPeriod(rides, period), [rides, period])
  const items = useMemo(() => rideHistoryItems(visibleRides), [visibleRides])
  const headerHeight = useHeaderHeight()

  const selectMetric = (next: HistoryMetric) => {
    if (next === metric) return
    selectionHaptic()
    setMetric(next)
  }

  const selectPeriod = (next: HistoryPeriod) => {
    if (next === period) return
    selectionHaptic()
    setPeriod(next)
  }

  return (
    <StatsBackground>
      <FlashList
        data={items}
        extraData={metric}
        keyExtractor={(item) => item.key}
        getItemType={(item) => item.type}
        renderItem={({ item }) => <HistoryRow item={item} metric={metric} />}
        ListHeaderComponent={
          <View>
            <PeriodChips selected={period} onSelect={selectPeriod} />
            <MetricTiles rides={visibleRides} allRides={rides} selected={metric} onSelect={selectMetric} />
            {visibleRides.length > 0 && <MetricChart rides={visibleRides} period={period} metric={metric} />}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty} tx="statistics.noRidesInPeriod" />}
        contentContainerStyle={{ ...styles.content, paddingTop: headerHeight }}
        contentInsetAdjustmentBehavior="never"
      />
    </StatsBackground>
  )
}

const PERIODS: { period: HistoryPeriod; label: TxKeyPath }[] = [
  { period: "all", label: "statistics.periodAll" },
  { period: "week", label: "statistics.periodWeek" },
  { period: "month", label: "statistics.periodMonth" },
  { period: "year", label: "statistics.periodYear" },
]

function PeriodChips({ selected, onSelect }: { selected: HistoryPeriod; onSelect: (period: HistoryPeriod) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chips}>
      {PERIODS.map(({ period, label }) => {
        const isSelected = period === selected
        return (
          <Pressable
            key={period}
            onPress={() => onSelect(period)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]} tx={label} />
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

/** Totals for the rides in view. The selected tile picks which pill each ride highlights. */
function MetricTiles({
  rides,
  allRides,
  selected,
  onSelect,
}: {
  rides: RideRecord[]
  allRides: RideRecord[]
  selected: HistoryMetric
  onSelect: (metric: HistoryMetric) => void
}) {
  const scrollRef = useRef<ScrollView>(null)
  const dragged = useRef(false)

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tilesScroll}
      contentContainerStyle={styles.tiles}
      onScrollBeginDrag={() => (dragged.current = true)}
      // In RTL the offset drifts off the first tile as the values widen the tiles. Native "end" is the RTL start
      onContentSizeChange={() => isRTL && !dragged.current && scrollRef.current?.scrollToEnd({ animated: false })}
    >
      {METRICS.map(({ metric, label, icon }) => (
        <MetricTile
          key={metric}
          value={metricValue(rides, metric)}
          text={formatMetric(metric, metricValue(rides, metric))}
          sizerText={formatMetric(metric, metricValue(allRides, metric))}
          label={translate(label)}
          icon={icon}
          selected={metric === selected}
          onPress={() => onSelect(metric)}
        />
      ))}
    </ScrollView>
  )
}

function MetricTile({
  value,
  text,
  sizerText,
  label,
  icon,
  selected,
  onPress,
}: {
  value: number | undefined
  text: string
  sizerText: string
  label: string | null
  icon: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <TouchableScale
      onPress={onPress}
      activeScale={0.95}
      friction={9}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      // The value may be SwiftUI text, which the tile's merged label skips
      accessibilityLabel={`${text}, ${label}`}
    >
      <View style={[styles.tile, selected && styles.tileSelected]}>
        <View style={[styles.tileIcon, selected && styles.tileIconSelected]}>
          <Text style={styles.tileIconText}>{icon}</Text>
        </View>
        <NumericText value={value} style={[styles.tileValue, selected && styles.tileTextSelected]} fillWidth>
          {text}
        </NumericText>
        {/* Sizes the tile for the all-time value, so switching periods rolls the digits without the tile jumping */}
        <Text style={[styles.tileValue, styles.tileSizer]} maxFontSizeMultiplier={1.1} accessibilityElementsHidden>
          {sizerText}
        </Text>
        <Text style={[styles.tileLabel, selected && styles.tileTextSelected]} numberOfLines={1}>
          {label?.toUpperCase()}
        </Text>
      </View>
    </TouchableScale>
  )
}

function HistoryRow({ item, metric }: { item: HistoryItem; metric: HistoryMetric }) {
  if (item.type === "day") {
    const pattern = isThisYear(item.date) ? "EEEE, d MMMM" : "EEEE, d MMMM yyyy"
    return <Text style={styles.day}>{format(item.date, pattern, { locale: dateFnsLocalization })}</Text>
  }
  return <RideRow ride={item.ride} firstOfDay={item.firstOfDay} metric={metric} />
}

function RideRow({ ride, firstOfDay, metric }: { ride: RideRecord; firstOfDay: boolean; metric: HistoryMetric }) {
  const router = useRouter()
  const late = ride.delay >= ON_TIME_THRESHOLD_MINUTES

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/statistics/ride", params: { id: ride.id } })}
      style={({ pressed }) => [styles.ride, !firstOfDay && styles.rideDivider, pressed && styles.pressed]}
    >
      <StopsStrip stops={ride.stationIds.length} highlighted={metric === "rides"} />
      <Text style={styles.rideRoute} numberOfLines={1}>
        {stationName(ride.originId)} {isRTL ? "←" : "→"} {stationName(ride.destinationId)}
      </Text>
      <View style={styles.rideDetails}>
        <Text style={styles.rideTime}>{formatTime(ride.departureTime)}</Text>
        <Pill
          text={late ? translate("statistics.lateBy", { count: ride.delay }) : translate("statistics.onTimeShort")}
          tone={late ? "late" : "onTime"}
          highlighted={metric === "onTime"}
        />
        <Pill text={rideDuration(ride)} highlighted={metric === "hours"} />
      </View>
    </Pressable>
  )
}

function Pill({ text, tone, highlighted }: { text: string | null; tone?: "late" | "onTime"; highlighted: boolean }) {
  const toneColor = tone === "late" ? statsPalette.orange : tone === "onTime" ? statsPalette.green : statsPalette.accent
  return (
    <View style={[styles.pill, highlighted && { backgroundColor: toneColor }]}>
      <Text
        style={[styles.pillText, tone && !highlighted && { color: toneColor }, highlighted && { color: statsPalette.background }]}
      >
        {text}
      </Text>
    </View>
  )
}

/** A line segment with a dot for every station the ride passed */
function StopsStrip({ stops, highlighted }: { stops: number; highlighted: boolean }) {
  const count = Math.max(2, stops)
  return (
    <View
      style={[styles.strip, highlighted && styles.stripHighlighted, { width: (count - 1) * STOP_SPACING + styles.strip.height }]}
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.stop, (index === 0 || index === count - 1) && styles.stopEnd]} />
      ))}
    </View>
  )
}

const tileRadius = isLiquidGlassSupported ? 22 : 16

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  pressed: {
    opacity: 0.6,
  },
  chipsScroll: {
    marginHorizontal: -theme.spacing[4],
    marginTop: theme.spacing[4],
  },
  chips: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  chip: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
    borderRadius: 999,
    backgroundColor: statsPalette.card,
  },
  chipSelected: {
    backgroundColor: statsPalette.text,
  },
  chipText: {
    color: statsPalette.accentSoft,
    fontSize: 15,
    fontWeight: "700",
  },
  chipTextSelected: {
    color: statsPalette.background,
  },
  empty: {
    color: statsPalette.muted,
    textAlign: "center",
    marginTop: theme.spacing[6],
  },
  tilesScroll: {
    marginHorizontal: -theme.spacing[4],
    marginTop: theme.spacing[3],
  },
  tiles: {
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    // Room for the icon badges on the tiles' top edge and the selected tile's lift
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[1],
  },
  tile: {
    minWidth: 112,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderRadius: tileRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
  },
  tileSelected: {
    backgroundColor: statsPalette.accent,
  },
  tileIcon: {
    position: "absolute",
    top: -12,
    end: 12,
    width: 28,
    height: 28,
    borderRadius: 9,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: statsPalette.cardRaised,
  },
  tileIconSelected: {
    backgroundColor: statsPalette.pill,
  },
  tileIconText: {
    fontSize: 15,
  },
  tileValue: {
    color: statsPalette.text,
    fontSize: 32,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
  },
  tileSizer: {
    height: 0,
    opacity: 0,
  },
  tileLabel: {
    color: statsPalette.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  tileTextSelected: {
    color: statsPalette.background,
  },
  day: {
    color: statsPalette.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[1],
  },
  ride: {
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[2],
  },
  rideDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: statsPalette.track,
  },
  strip: {
    height: 12,
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 3,
    borderRadius: 6,
    backgroundColor: statsPalette.pill,
    overflow: "hidden",
  },
  stripHighlighted: {
    backgroundColor: statsPalette.accent,
  },
  stop: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: statsPalette.text,
    opacity: 0.45,
  },
  stopEnd: {
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 1,
  },
  rideRoute: {
    color: statsPalette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rideDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  rideTime: {
    color: statsPalette.muted,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginEnd: theme.spacing[1],
  },
  pill: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: statsPalette.pill,
  },
  pillText: {
    color: statsPalette.accentSoft,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
}))
