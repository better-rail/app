import React, { useEffect, useState } from "react"
import { Alert, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Svg, { Circle, Defs, Path, Pattern, Rect } from "react-native-svg"
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from "react-native-reanimated"
import HapticFeedback from "react-native-haptic-feedback"
import { useLocalSearchParams, useRouter } from "expo-router"
import { format } from "date-fns"
import { Text } from "@/components"
import { StatsScreen } from "./stats-screen"
import { stationLocale, stationsObject } from "@/data/stations"
import { dateFnsLocalization, translate, type TxKeyPath } from "@/i18n"
import { useRideHistoryStore, type RideRecord } from "@/models"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { ON_TIME_THRESHOLD_MINUTES } from "./compute-stats"
import { nearbyStations, pathLength, projectStations } from "./route-map"
import { rideDistance, rideDuration } from "./ride-format"
import { statsPalette } from "./statistics-palette"

const AnimatedPath = Animated.createAnimatedComponent(Path)

const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""

const MAP_HEIGHT = 300
const MAP_PADDING = 36

export function RideDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const ride = useRideHistoryStore((state) => state.rides.find((item) => item.id === id))
  const removeRide = useRideHistoryStore((state) => state.removeRide)
  const router = useRouter()

  // The ride is gone once removed, while the sheet animates away
  if (!ride) return null

  const hours = (ride.arrivalTime - ride.departureTime) / 3600000
  const speed = hours > 0 ? Math.round(ride.distanceKm / hours) : 0
  const late = ride.delay >= ON_TIME_THRESHOLD_MINUTES
  const changes = Math.max(0, ride.trainNumbers.length - 1)

  const planAgain = () => {
    router.dismissTo({
      pathname: "/route-list",
      params: {
        originId: ride.originId,
        destinationId: ride.destinationId,
        time: String(Date.now()),
        enableQuery: "true",
      },
    })
  }

  const confirmRemove = () => {
    Alert.alert(translate("statistics.removeRideTitle") ?? "", translate("statistics.removeRideMessage") ?? "", [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      {
        text: translate("statistics.remove") ?? "",
        style: "destructive",
        onPress: () => {
          router.back()
          removeRide(ride.id)
        },
      },
    ])
  }

  return (
    <StatsScreen>
      <Text style={styles.weekday}>{format(ride.departureTime, "EEEE", { locale: dateFnsLocalization })}</Text>
      <Text style={styles.date}>{format(ride.departureTime, "d MMMM yyyy", { locale: dateFnsLocalization })}</Text>
      <Text style={styles.timeRange}>
        {translate("statistics.timeRange", { from: formatTime(ride.departureTime), to: formatTime(ride.arrivalTime) })}
      </Text>

      <View style={styles.mapCard}>
        <RouteMap ride={ride} />
        <View style={styles.legend}>
          <LegendItem color={statsPalette.green} name={stationName(ride.originId)} />
          <LegendItem color={statsPalette.orange} name={stationName(ride.destinationId)} />
        </View>
        <View style={styles.mapStats}>
          <MapStat value={rideDistance(ride)} />
          <View style={styles.mapStatsDivider} />
          <MapStat value={rideDuration(ride)} />
          <View style={styles.mapStatsDivider} />
          <MapStat value={translate("statistics.kmhValue", { count: speed })} />
        </View>
      </View>

      <View style={styles.rows}>
        <DetailRow
          icon="🚉"
          label="statistics.departed"
          value={`${formatTime(ride.departureTime)} · ${stationName(ride.originId)}`}
        />
        <DetailRow
          icon="🏁"
          label="statistics.arrived"
          value={`${formatTime(ride.arrivalTime)} · ${stationName(ride.destinationId)}`}
        />
        <DetailRow
          icon={late ? "🐢" : "🎯"}
          label="statistics.delay"
          value={late ? translate("statistics.lateBy", { count: ride.delay }) : translate("statistics.onTimeShort")}
          valueColor={late ? statsPalette.orange : statsPalette.green}
        />
        <DetailRow icon="📍" label="statistics.stationsPassed" value={String(ride.stationIds.length)} />
        <DetailRow
          icon="🔁"
          label="statistics.changes"
          value={changes === 0 ? translate("statistics.direct") : String(changes)}
        />
        <DetailRow icon="🚆" label="statistics.trains" value={ride.trainNumbers.join(" · ")} last />
      </View>

      <Pressable onPress={planAgain} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <Text style={styles.primaryButtonText} tx="statistics.planAgain" />
      </Pressable>
      <Pressable onPress={confirmRemove} style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
        <Text style={styles.removeButtonText} tx="statistics.removeRide" />
      </Pressable>
    </StatsScreen>
  )
}

/** The ride drawn on the stations' real coordinates. The line draws itself in; tap a stop to name it. */
function RouteMap({ ride }: { ride: RideRecord }) {
  const [width, setWidth] = useState(0)
  const [selectedStop, setSelectedStop] = useState<number>()
  const points = width ? projectStations(ride.stationIds, width, MAP_HEIGHT, MAP_PADDING) : []
  const nearby = width ? nearbyStations(ride.stationIds, width, MAP_HEIGHT, MAP_PADDING) : []
  const length = pathLength(points)
  const progress = useSharedValue(0)

  useEffect(() => {
    if (!length) return
    progress.set(0)
    progress.set(withDelay(250, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })))
  }, [length, progress])

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.get()) }))
  const d = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")
  const selectedPoint = selectedStop === undefined ? undefined : points[selectedStop]

  const selectStop = (index: number) => {
    HapticFeedback.trigger("selection")
    setSelectedStop((current) => (current === index ? undefined : index))
  }

  return (
    <View style={styles.map} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={MAP_HEIGHT}>
          <Defs>
            <Pattern id="grid" width={24} height={24} patternUnits="userSpaceOnUse">
              <Path d="M24 0 L0 0 0 24" fill="none" stroke={statsPalette.track} strokeWidth={0.5} />
            </Pattern>
          </Defs>
          <Rect width={width} height={MAP_HEIGHT} fill="url(#grid)" />
          {nearby.map((point, index) => (
            <Circle key={index} cx={point.x} cy={point.y} r={2.5} fill={statsPalette.muted} fillOpacity={0.35} />
          ))}
          {/* A soft glow under the line */}
          <AnimatedPath
            d={d}
            fill="none"
            stroke={statsPalette.accent}
            strokeOpacity={0.25}
            strokeWidth={14}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[length, length]}
            animatedProps={lineProps}
          />
          <AnimatedPath
            d={d}
            fill="none"
            stroke={statsPalette.accent}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[length, length]}
            animatedProps={lineProps}
          />
          {points.map((point, index) => {
            const end = index === 0 || index === points.length - 1
            if (end) return null
            return (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={index === selectedStop ? 6 : 4}
                fill={statsPalette.background}
                stroke={statsPalette.accentSoft}
                strokeWidth={2}
                onPress={() => selectStop(index)}
              />
            )
          })}
          {points.length > 0 && (
            <>
              <Circle
                cx={points[0].x}
                cy={points[0].y}
                r={9}
                fill={statsPalette.green}
                stroke={statsPalette.text}
                strokeWidth={3}
                onPress={() => selectStop(0)}
              />
              <Circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r={9}
                fill={statsPalette.orange}
                stroke={statsPalette.text}
                strokeWidth={3}
                onPress={() => selectStop(points.length - 1)}
              />
            </>
          )}
        </Svg>
      )}

      {selectedPoint && selectedStop !== undefined && (
        <View pointerEvents="none" style={styles.stopLayer}>
          <View style={[styles.stopLabel, { top: selectedPoint.y - 40, left: selectedPoint.x - 80 }]}>
            <Text style={styles.stopLabelText} numberOfLines={1}>
              {stationName(ride.stationIds[selectedStop])}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

function LegendItem({ color, name }: { color: string; name: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText} numberOfLines={1}>
        {name}
      </Text>
    </View>
  )
}

function MapStat({ value }: { value: string | null }) {
  return (
    <Text style={styles.mapStat} maxFontSizeMultiplier={1.2}>
      {value}
    </Text>
  )
}

function DetailRow({
  icon,
  label,
  value,
  valueColor,
  last,
}: {
  icon: string
  label: TxKeyPath
  value: string | null
  valueColor?: string
  last?: boolean
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel} tx={label} />
      <Text style={[styles.rowValue, valueColor && { color: valueColor }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const cardRadius = isLiquidGlassSupported ? 26 : 18

const styles = StyleSheet.create((theme) => ({
  pressed: {
    opacity: 0.7,
  },
  weekday: {
    color: statsPalette.accent,
    fontSize: 17,
    fontWeight: "700",
  },
  date: {
    color: statsPalette.text,
    fontSize: 34,
    fontWeight: "800",
  },
  timeRange: {
    color: statsPalette.muted,
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  mapCard: {
    marginTop: theme.spacing[4],
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
    overflow: "hidden",
  },
  map: {
    height: MAP_HEIGHT,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[3],
  },
  legendItem: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: statsPalette.cardRaised,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: statsPalette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  // SVG coordinates don't flip in RTL, so the label's position mustn't either
  stopLayer: {
    ...StyleSheet.absoluteFillObject,
    direction: "ltr",
  },
  stopLabel: {
    position: "absolute",
    width: 160,
    alignItems: "center",
  },
  stopLabelText: {
    color: statsPalette.background,
    backgroundColor: statsPalette.text,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  mapStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing[3],
    backgroundColor: statsPalette.cardRaised,
  },
  mapStat: {
    flex: 1,
    textAlign: "center",
    color: statsPalette.text,
    fontSize: 18,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  mapStatsDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: statsPalette.track,
  },
  rows: {
    marginTop: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: statsPalette.track,
  },
  rowIcon: {
    fontSize: 16,
  },
  rowLabel: {
    color: statsPalette.accentSoft,
    fontSize: 15,
    fontWeight: "600",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    color: statsPalette.text,
    fontSize: 15,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  primaryButton: {
    marginTop: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: statsPalette.accent,
  },
  primaryButtonText: {
    color: statsPalette.background,
    fontSize: 17,
    fontWeight: "800",
  },
  removeButton: {
    marginTop: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    alignItems: "center",
  },
  removeButtonText: {
    color: "#FF7A7A",
    fontSize: 16,
    fontWeight: "600",
  },
}))
