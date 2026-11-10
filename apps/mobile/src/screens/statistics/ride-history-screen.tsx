import React, { useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { FlashList } from "@shopify/flash-list"
import HapticFeedback from "react-native-haptic-feedback"
import TouchableScale from "react-native-touchable-scale"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import { format, isThisYear } from "date-fns"
import { Text } from "@/components"
import { StatsBackground } from "./stats-screen"
import { StatsDisplayText } from "./stats-display-text"
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
import { formatMetric, rideDistance, rideDuration } from "./ride-format"
import { MetricChart } from "./metric-chart"
import { NumericText } from "./numeric-text"

const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""

const METRICS: { metric: HistoryMetric; label: TxKeyPath; icon: string }[] = [
  { metric: "rides", label: "statistics.rides", icon: "🎫" },
  { metric: "hours", label: "statistics.hoursOnTrain", icon: "⏱️" },
  { metric: "distance", label: "statistics.distanceTravelled", icon: "🛤️" },
  { metric: "onTime", label: "statistics.legendOnTime", icon: "🎯" },
]

const selectionHaptic = () => HapticFeedback.trigger("selection")

export function RideHistoryScreen() {
  const rides = useRideHistoryStore((state) => state.rides)
  const params = useLocalSearchParams<{ metric?: string }>()
  const [metric, setMetric] = useState<HistoryMetric>(
    () => METRICS.find((item) => item.metric === params.metric)?.metric ?? "rides",
  )
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

/** Totals for the rides in view. The selected tile highlights the corresponding detail in each ride. */
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
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const dragged = useRef(false)
  const initialMetric = useRef(selected)

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tilesScroll}
      contentContainerStyle={styles.tiles}
      onScrollBeginDrag={() => (dragged.current = true)}
      // Reveal a metric opened from the overview, while leaving the strip alone once the rider scrolls it.
      onContentSizeChange={() => {
        if (dragged.current) return
        const showLastTiles = initialMetric.current === "distance" || initialMetric.current === "onTime"
        if (showLastTiles !== isRTL) scrollRef.current?.scrollToEnd({ animated: false })
        else if (isRTL) scrollRef.current?.scrollTo({ x: 0, animated: false })
      }}
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
        <StatsDisplayText englishSize={17} style={[styles.tileLabel, selected && styles.tileTextSelected]} numberOfLines={1}>
          {label?.toUpperCase()}
        </StatsDisplayText>
      </View>
    </TouchableScale>
  )
}

function HistoryRow({ item, metric }: { item: HistoryItem; metric: HistoryMetric }) {
  if (item.type === "day") {
    const pattern = isThisYear(item.date) ? "EEEE, d MMMM" : "EEEE, d MMMM yyyy"
    return (
      <Text style={styles.day} accessibilityRole="header">
        {format(item.date, pattern, { locale: dateFnsLocalization })}
      </Text>
    )
  }
  return <RideRow ride={item.ride} metric={metric} />
}

function RideRow({ ride, metric }: { ride: RideRecord; metric: HistoryMetric }) {
  const router = useRouter()
  const late = ride.delay >= ON_TIME_THRESHOLD_MINUTES
  const status = late ? translate("statistics.lateBy", { count: ride.delay }) : translate("statistics.onTimeShort")
  const duration = rideDuration(ride)
  const distance = metric === "distance" ? rideDistance(ride) : undefined
  const origin = stationName(ride.originId)
  const destination = stationName(ride.destinationId)

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/statistics/ride", params: { id: ride.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${translate("statistics.departed")} ${formatTime(ride.departureTime)}, ${origin}, ${translate("statistics.arrived")} ${destination}, ${duration}${distance ? `, ${distance}` : ""}, ${status}`}
      style={({ pressed }) => [styles.ride, pressed && styles.ridePressed]}
    >
      <View style={styles.rideHeader}>
        <View style={styles.rideSchedule}>
          <Text style={styles.rideTime}>{formatTime(ride.departureTime)}</Text>
          <Text style={styles.scheduleSeparator} accessibilityElementsHidden importantForAccessibility="no">
            ·
          </Text>
          <Text style={[styles.rideDuration, (metric === "hours" || metric === "distance") && styles.durationHighlighted]}>
            {distance ?? duration}
          </Text>
        </View>
        <Pill text={status} tone={late ? "late" : "onTime"} />
      </View>
      <View style={styles.rideRoute}>
        <StopsRail stops={ride.stationIds.length} highlighted={metric === "rides"} />
        <View style={styles.rideStations}>
          <Text style={styles.rideStation}>{origin}</Text>
          <Text style={styles.rideStation}>{destination}</Text>
        </View>
      </View>
    </Pressable>
  )
}

function Pill({ text, tone }: { text: string | null; tone: "late" | "onTime" }) {
  const toneColor = tone === "late" ? statsPalette.orange : statsPalette.green
  return (
    <View style={[styles.pill, tone === "late" ? styles.pillLate : styles.pillOnTime]}>
      <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
      <Text style={[styles.pillText, { color: toneColor }]}>{text}</Text>
    </View>
  )
}

/** A compact route marker; cap intermediate dots so long trips stay legible. */
function StopsRail({ stops, highlighted }: { stops: number; highlighted: boolean }) {
  const count = Math.min(6, Math.max(2, stops))
  return (
    <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.railLine, highlighted && styles.railLineHighlighted]} />
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[
            styles.stop,
            highlighted && styles.stopHighlighted,
            (index === 0 || index === count - 1) && styles.stopEnd,
            index === 0 && styles.stopOrigin,
          ]}
        />
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
    color: statsPalette.muted,
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: theme.spacing[1],
    marginTop: theme.spacing[6],
    marginBottom: theme.spacing[3],
  },
  ride: {
    padding: theme.spacing[4],
    marginBottom: theme.spacing[2],
    gap: theme.spacing[4],
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "rgba(139, 143, 255, 0.08)",
  },
  ridePressed: {
    backgroundColor: statsPalette.cardRaised,
  },
  rideHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[2],
  },
  rideSchedule: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: theme.spacing[2],
    rowGap: theme.spacing[1],
  },
  rail: {
    width: 10,
    alignSelf: "stretch",
    marginVertical: 7,
    alignItems: "center",
    justifyContent: "space-between",
  },
  railLine: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: 2,
    backgroundColor: statsPalette.pill,
  },
  railLineHighlighted: {
    backgroundColor: statsPalette.accent,
  },
  stop: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: statsPalette.muted,
  },
  stopHighlighted: {
    backgroundColor: statsPalette.accent,
  },
  stopEnd: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: statsPalette.accentSoft,
  },
  stopOrigin: {
    borderWidth: 2,
    borderColor: statsPalette.accentSoft,
    backgroundColor: statsPalette.card,
  },
  rideRoute: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  rideStations: {
    flex: 1,
    gap: theme.spacing[2],
  },
  rideStation: {
    color: statsPalette.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    flexShrink: 1,
  },
  rideTime: {
    color: statsPalette.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    writingDirection: "ltr",
    ...statsNumberFont,
  },
  scheduleSeparator: {
    color: statsPalette.muted,
    fontSize: 14,
  },
  rideDuration: {
    color: statsPalette.muted,
    fontSize: 13,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    paddingHorizontal: theme.spacing[1],
    paddingVertical: 3,
    borderRadius: 6,
    overflow: "hidden",
  },
  durationHighlighted: {
    color: statsPalette.background,
    backgroundColor: statsPalette.accent,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: "continuous",
    flexShrink: 1,
  },
  pillLate: {
    backgroundColor: "rgba(251, 169, 40, 0.1)",
  },
  pillOnTime: {
    backgroundColor: "rgba(90, 209, 107, 0.1)",
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
  },
}))
