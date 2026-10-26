import React, { useMemo } from "react"
import { ImageBackground, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { Stack, useLocalSearchParams } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import { Text } from "@/components"
import { StatsScreen } from "./stats-screen"
import { stationLocale, stationsObject } from "@/data/stations"
import { isRTL, translate } from "@/i18n"
import { useRideHistoryStore } from "@/models"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { ON_TIME_THRESHOLD_MINUTES, computeUsualTrainDetails } from "./compute-stats"
import { statsNumberFont, statsPalette } from "./statistics-palette"

const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""

const CHART_HEIGHT = 96
const MIN_BAR_HEIGHT = 6

export function UsualTrainScreen() {
  const params = useLocalSearchParams<{ originId: string; destinationId: string; departureTime: string }>()
  const trip = { originId: params.originId, destinationId: params.destinationId, departureTime: Number(params.departureTime) }
  const rides = useRideHistoryStore((state) => state.rides)
  const details = useMemo(
    () => computeUsualTrainDetails(rides, trip),
    [rides, trip.originId, trip.destinationId, trip.departureTime],
  )
  const time = formatTime(trip.departureTime)
  const image = stationsObject[trip.originId]?.image
  const headerHeight = useHeaderHeight()

  return (
    // The station photo is the header, so the content starts at the top edge
    <StatsScreen style={styles.screen}>
      <Stack.Screen
        options={{
          title: translate("statistics.trainOf", { time }) ?? "",
          headerTitle: "",
          scrollEdgeEffects: { top: "hidden" },
        }}
      />

      <ImageBackground source={image} style={[styles.hero, { paddingTop: headerHeight }]}>
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={["rgba(16, 21, 58, 0.6)", "rgba(16, 21, 58, 0)", "rgba(16, 21, 58, 0.75)", statsPalette.background]}
          locations={[0, 0.35, 0.8, 1]}
        />
        <View style={styles.heroCaption}>
          <Text style={styles.heroTime} maxFontSizeMultiplier={1.1}>
            {time}
          </Text>
          <Text style={styles.heroRoute} numberOfLines={1}>
            {stationName(trip.originId)} {isRTL ? "←" : "→"} {stationName(trip.destinationId)}
          </Text>
        </View>
      </ImageBackground>

      <View style={styles.card}>
        <View style={styles.totals}>
          <Total value={String(details.rideCount)} label={translate("statistics.rides")} />
          <View style={styles.totalsDivider} />
          <Total
            value={String(details.averageDelayMinutes)}
            unit={translate("statistics.minutesUnit")}
            label={translate("statistics.averageDelayLabel")}
            highlight
          />
          <View style={styles.totalsDivider} />
          <Total
            value={String(details.averageDurationMinutes)}
            unit={translate("statistics.minutesUnit")}
            label={translate("statistics.onRoute")}
          />
        </View>
      </View>

      <View style={[styles.card, styles.chartCard]}>
        <Text style={styles.chartTitle}>
          {translate("statistics.recentOnTime", { onTime: details.recentOnTimeCount, total: details.recentDelays.length })}
        </Text>
        <DelayBars delays={details.recentDelays} />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.barOnTime]} />
            <Text style={styles.legendText} tx="statistics.legendOnTime" />
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, styles.barLate]} />
            <Text style={styles.legendText} tx="statistics.legendLate" />
          </View>
          <View style={styles.legendSpacer} />
          <Text style={styles.legendText} tx="statistics.legendOrder" />
        </View>
      </View>

      {details.betterTrain && (
        <View style={styles.tip}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            {translate("statistics.betterTrainTip", {
              time: formatTime(details.betterTrain.departureTime),
              count: details.betterTrain.minutesLessLate,
            })}
          </Text>
        </View>
      )}
    </StatsScreen>
  )
}

/** One bar per ride, height is the delay. The dashed line marks the on-time threshold. */
function DelayBars({ delays }: { delays: number[] }) {
  // Scale to the worst delay, but keep the threshold line no lower than mid-chart
  const max = Math.max(ON_TIME_THRESHOLD_MINUTES * 2, ...delays)
  const thresholdY = (ON_TIME_THRESHOLD_MINUTES / max) * CHART_HEIGHT

  return (
    <View style={styles.chart}>
      <View style={[styles.threshold, { bottom: thresholdY }]}>
        <Text style={styles.thresholdLabel}>{translate("statistics.minutesShort", { count: ON_TIME_THRESHOLD_MINUTES })}</Text>
      </View>
      <View style={styles.bars}>
        {delays.map((delay, index) => {
          const height = Math.max(MIN_BAR_HEIGHT, (delay / max) * CHART_HEIGHT)
          const onTime = delay < ON_TIME_THRESHOLD_MINUTES
          return <View key={index} style={[styles.bar, onTime ? styles.barOnTime : styles.barLate, { height }]} />
        })}
      </View>
    </View>
  )
}

function Total({
  value,
  unit,
  label,
  highlight,
}: {
  value: string
  unit?: string | null
  label: string | null
  highlight?: boolean
}) {
  return (
    <View style={styles.total}>
      <View style={styles.totalValueRow}>
        <Text style={[styles.totalValue, highlight && styles.totalValueHighlight]} maxFontSizeMultiplier={1.1}>
          {value}
        </Text>
        {unit && <Text style={[styles.totalUnit, highlight && styles.totalValueHighlight]}>{unit}</Text>}
      </View>
      <Text style={styles.totalLabel}>{label}</Text>
    </View>
  )
}

const cardRadius = isLiquidGlassSupported ? 20 : 14

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
    marginBottom: theme.spacing[4],
    overflow: "hidden",
  },
  screen: {
    paddingTop: 0,
  },
  hero: {
    minHeight: 320,
    justifyContent: "flex-end",
    marginHorizontal: -theme.spacing[4],
    marginBottom: theme.spacing[3],
    backgroundColor: statsPalette.cardRaised,
  },
  heroCaption: {
    paddingHorizontal: theme.spacing[6],
    paddingBottom: theme.spacing[2],
  },
  heroTime: {
    color: theme.colors.palette.white,
    fontSize: 56,
    fontWeight: "800",
    lineHeight: 64,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
  },
  heroRoute: {
    color: theme.colors.palette.white,
    fontSize: 16,
    fontWeight: "600",
    opacity: 0.92,
  },
  totals: {
    flexDirection: "row",
    paddingVertical: theme.spacing[4],
  },
  total: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  totalsDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: statsPalette.track,
    marginVertical: theme.spacing[1],
  },
  totalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: "700",
    color: statsPalette.text,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
  },
  totalUnit: {
    fontSize: 15,
    fontWeight: "600",
    color: statsPalette.text,
  },
  totalValueHighlight: {
    color: statsPalette.accent,
  },
  totalLabel: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  chartCard: {
    padding: theme.spacing[4],
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: statsPalette.text,
    marginBottom: theme.spacing[5],
  },
  chart: {
    height: CHART_HEIGHT,
    justifyContent: "flex-end",
  },
  threshold: {
    position: "absolute",
    start: 0,
    end: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: statsPalette.muted,
    opacity: 0.6,
  },
  thresholdLabel: {
    position: "absolute",
    end: 0,
    top: -16,
    fontSize: 11,
    color: statsPalette.muted,
  },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    paddingEnd: 28,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
  },
  barOnTime: {
    backgroundColor: statsPalette.green,
  },
  barLate: {
    backgroundColor: statsPalette.orange,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    marginTop: theme.spacing[3],
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendSpacer: {
    flex: 1,
  },
  legendText: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  tip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.pill,
  },
  tipIcon: {
    fontSize: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 15,
    color: statsPalette.accentSoft,
  },
}))
