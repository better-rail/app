import React, { useEffect, useMemo, useState } from "react"
import { Image, ImageBackground, Platform, Pressable, View, type ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import LinearGradient from "react-native-linear-gradient"
import { useRouter } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg"
import { format } from "date-fns"
import { Text } from "@/components"
import { StatsScreen } from "./stats-screen"
import { StatsDisplayText } from "./stats-display-text"
import { stationLocale, stationsObject } from "@/data/stations"
import { dateFnsLocalization, translate, userLocale, type TxKeyPath } from "@/i18n"
import { randomRiderNameSeed, riderName } from "./rider-names"
import { useRideHistoryStore, type RideRecord } from "@/models"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { GlassView } from "expo-glass-effect"
import {
  computeAchievements,
  computeStats,
  metricChart,
  metricValue,
  weekDelays,
  firstRideDate,
  nextAchievement,
  riderRank,
  ridesToNextRank,
  type Achievement,
} from "./compute-stats"
import { formatMetric } from "./ride-format"
import { statsNumberFont, statsPalette } from "./statistics-palette"
import { CHEVRON_ICON } from "@/screens/settings/components/settings-box"

const chevronIcon = require("../../../assets/chevron.png")
const arrowIcon = require("../../../assets/arrow-left.png")

const formatNumber = (value: number) => Math.round(value).toLocaleString(userLocale)
const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""
// Rider profile and next achievement are hidden for now
const SHOW_RIDER_PROFILE = false
const SHOW_NEXT_ACHIEVEMENT = false

export function StatisticsScreen() {
  const rides = useRideHistoryStore((state) => state.rides)
  const stats = useMemo(() => computeStats(rides), [rides])
  const achievement = useMemo(() => (SHOW_NEXT_ACHIEVEMENT ? nextAchievement(computeAchievements(rides)) : undefined), [rides])
  const since = firstRideDate(rides)

  const hasRides = rides.length > 0

  return (
    // The rides hero is the header, so the content starts at the top edge
    <StatsScreen style={styles.screen}>
      {SHOW_RIDER_PROFILE && hasRides && <RiderProfile rides={rides} />}

      <RidesHero count={stats.rideCount} since={since} />

      {!hasRides && <EmptyHint />}

      <TimeOnTrainCard rides={rides} />

      <WeekDelaysCard rides={rides} />
      {stats.onTime && <OnTimeCard percent={stats.onTime.percent} averageDelay={stats.onTime.averageDelayMinutes} />}

      {stats.usualTrain && <UsualTrainCard {...stats.usualTrain} />}

      {SHOW_NEXT_ACHIEVEMENT && hasRides && <AchievementCard achievement={achievement} />}
    </StatsScreen>
  )
}

/** Liquid glass where supported (interactive for tappable cards), a plain card elsewhere */
function Card({ children, style, interactive }: { children: React.ReactNode; style?: ViewStyle; interactive?: boolean }) {
  if (!isLiquidGlassSupported) return <View style={[styles.card, style]}>{children}</View>
  return (
    <GlassView
      isInteractive={interactive}
      colorScheme="dark"
      tintColor={statsPalette.glassTint}
      style={[styles.card, styles.glassCard, style]}
    >
      {children}
    </GlassView>
  )
}

/** Tappable card; glass gives its own press feedback, the plain card dims */
function PressableCard({
  children,
  style,
  containerStyle,
  onPress,
}: {
  children: React.ReactNode
  style?: ViewStyle
  containerStyle?: ViewStyle
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [containerStyle, !isLiquidGlassSupported && pressed && styles.cardPressed]}
    >
      <Card interactive style={style}>
        {children}
      </Card>
    </Pressable>
  )
}

/** Nickname badge, level, and progress to the next level. Tapping the badge rerolls the name. */
function RiderProfile({ rides }: { rides: ReturnType<typeof useRideHistoryStore.getState>["rides"] }) {
  const seed = useRideHistoryStore((state) => state.riderNameSeed)
  const setRiderNameSeed = useRideHistoryStore((state) => state.setRiderNameSeed)
  const level = riderRank(rides.length)
  const since = firstRideDate(rides)
  const remaining = ridesToNextRank(rides.length)
  const progress = remaining === undefined ? 1 : 1 - remaining / (rides.length + remaining)
  const { name, emoji } = riderName(seed ?? 0, userLocale)

  useEffect(() => {
    if (seed === undefined) setRiderNameSeed(randomRiderNameSeed())
  }, [seed])

  return (
    <View style={styles.profile}>
      <Pressable
        onPress={() => setRiderNameSeed(randomRiderNameSeed())}
        accessibilityRole="button"
        accessibilityHint={translate("statistics.rerollHint") ?? undefined}
        style={({ pressed }) => [styles.badgeTile, pressed && styles.badgeTilePressed]}
      >
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={["#7B7EFF", "#4144BC"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.badgeTileShine} />
        <Text style={styles.badgeTileEmoji}>{emoji}</Text>
      </Pressable>
      <StatsDisplayText englishSize={32} style={styles.profileRank}>
        {name}
      </StatsDisplayText>
      <View style={styles.profilePills}>
        <View style={[styles.pill, styles.pillAccent]}>
          <Text style={[styles.pillText, styles.pillAccentText]}>{translate("statistics.level", { level })}</Text>
        </View>
        {since && (
          <View style={styles.pill}>
            <Text style={styles.pillText}>
              {translate("statistics.since", { date: format(since, "MMM yyyy", { locale: dateFnsLocalization }) })}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.rankProgress}>
        <ProgressBar progress={progress} />
        <Text style={styles.cardFootnote}>
          {remaining === undefined
            ? translate("statistics.topLevel")
            : translate("statistics.toNextLevel", { count: remaining, level: level + 1 })}
        </Text>
      </View>
    </View>
  )
}

/** Full-bleed gradient behind the status bar and close button, with the ride count */
function RidesHero({ count, since }: { count: number; since: number | undefined }) {
  const headerHeight = useHeaderHeight()
  const router = useRouter()

  return (
    <View style={[styles.hero, { paddingTop: headerHeight }]}>
      <HeroGradient />
      <Text style={styles.heroValue} maxFontSizeMultiplier={1.1}>
        {formatNumber(count)}
      </Text>
      <StatsDisplayText englishSize={22} style={styles.heroLabel} tx="statistics.rides" />
      {since && (
        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>
            {translate("statistics.since", { date: format(since, "MMMM yyyy", { locale: dateFnsLocalization }) })}
          </Text>
        </View>
      )}
      {count > 0 && (
        <Pressable
          onPress={() => router.push("/statistics/history")}
          accessibilityRole="button"
          style={({ pressed }) => [styles.historyLink, pressed && styles.cardPressed]}
        >
          <StatsDisplayText englishSize={18} style={styles.historyLinkText} tx="statistics.seeHistory" />
          <Image style={[CHEVRON_ICON, styles.historyChevron]} source={chevronIcon} />
        </Pressable>
      )}
    </View>
  )
}

const heroTop = "#5E5CE6"

// Eased fade-out stops, so the hero melts into the page without a visible edge where the gradient stops
const heroFadeStops = Array.from({ length: 12 }, (_, index) => {
  const offset = index / 11
  // Holds full color behind the number, then a smoothstep fade over the lower part
  const t = Math.max(0, (offset - 0.3) / 0.7)
  return { offset, opacity: 1 - t * t * (3 - 2 * t) }
})

// How far the gradient reaches above the hero, to fill the pull-down bounce
const HERO_OVERSCROLL = 1000

/** Indigo base with soft violet and blue lights, fading out at the bottom and continuing up into the bounce */
function HeroGradient() {
  // The SVG needs a measured size; percentage sizes render at a stale height
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 })
  // Gradients use hero coordinates shifted below the overscroll area; above the hero they pad or keep fading upward
  const top = HERO_OVERSCROLL

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(event) => setSize(event.nativeEvent.layout)}>
      <Svg width={width} height={height + top} style={styles.heroSvg}>
        <Defs>
          <SvgLinearGradient id="heroBase" gradientUnits="userSpaceOnUse" x1={0} y1={top} x2={0} y2={top + height}>
            {heroFadeStops.map(({ offset, opacity }) => (
              <Stop key={offset} offset={offset} stopColor={heroTop} stopOpacity={opacity} />
            ))}
          </SvgLinearGradient>
          <RadialGradient
            id="heroGlow"
            gradientUnits="userSpaceOnUse"
            cx={width / 2}
            cy={top + height * 0.48}
            rx={width * 0.55}
            ry={height * 0.38}
          >
            <Stop offset="0" stopColor="#A7A3FF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#A7A3FF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="heroViolet" gradientUnits="userSpaceOnUse" cx={0} cy={top} rx={width * 0.75} ry={height * 0.55}>
            <Stop offset="0" stopColor="#B57BFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#B57BFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient
            id="heroBlue"
            gradientUnits="userSpaceOnUse"
            cx={width}
            cy={top + height * 0.1}
            rx={width * 0.7}
            ry={height * 0.5}
          >
            <Stop offset="0" stopColor="#4FA3FF" stopOpacity={0.4} />
            <Stop offset="1" stopColor="#4FA3FF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#heroBase)" />
        <Rect width="100%" height="100%" fill="url(#heroViolet)" />
        <Rect width="100%" height="100%" fill="url(#heroBlue)" />
        <Rect width="100%" height="100%" fill="url(#heroGlow)" />
      </Svg>
    </View>
  )
}

/** Health-app style metric: tinted icon and title, a big value with its unit, and a small chart at the end */
function MetricCard({
  icon,
  color,
  title,
  value,
  unit,
  helper,
  accessory,
  onPress,
}: {
  icon: React.ReactNode
  color: string
  title: string | null
  value: string
  unit?: string | null
  helper?: string | null
  accessory?: React.ReactNode
  onPress?: () => void
}) {
  const content = (
    <>
      <View style={styles.metricHeader}>
        <View style={styles.metricTitleRow}>
          {icon}
          <StatsDisplayText englishSize={20} style={[styles.metricTitle, { color }]}>
            {title}
          </StatsDisplayText>
        </View>
        {onPress && <Image style={[CHEVRON_ICON, styles.metricChevron]} source={chevronIcon} />}
      </View>
      <View style={styles.metricBody}>
        <View style={styles.metricReading}>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue} maxFontSizeMultiplier={1.1}>
              {value}
            </Text>
            {unit && <Text style={styles.metricUnit}>{unit}</Text>}
          </View>
          {helper && <Text style={styles.cardFootnote}>{helper}</Text>}
        </View>
        {accessory}
      </View>
    </>
  )

  if (!onPress) return <Card style={styles.metricCard}>{content}</Card>
  return (
    <PressableCard onPress={onPress} style={styles.metricCard}>
      {content}
    </PressableCard>
  )
}

/** Time on trains, with a direct link to the corresponding history chart. */
function TimeOnTrainCard({ rides }: { rides: RideRecord[] }) {
  const router = useRouter()
  const { buckets } = useMemo(() => metricChart(rides, "all", "hours"), [rides])

  return (
    <MetricCard
      icon={<ClockIcon color={statsPalette.orange} />}
      color={statsPalette.orange}
      title={translate("statistics.hoursOnTrain")}
      value={formatMetric("hours", metricValue(rides, "hours"))}
      unit={translate("statistics.hoursUnit")}
      onPress={rides.length > 0 ? () => router.push({ pathname: "/statistics/history", params: { metric: "hours" } }) : undefined}
      accessory={<ActivityBars values={buckets.map((bucket) => bucket.value ?? 0)} color={statsPalette.orange} />}
    />
  )
}

/** A compact, decorative preview of the history chart; empty periods stay on the baseline. */
function ActivityBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values)
  return (
    <View style={styles.activityBars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {values.map((value, index) => (
        <View
          key={index}
          style={[
            styles.activityBar,
            { height: Math.max(2, (value / max) * 40), backgroundColor: color, opacity: value > 0 ? 1 : 0.2 },
          ]}
        />
      ))}
    </View>
  )
}

const MINI_BAR_HEIGHT = 32

function WeekDelaysCard({ rides }: { rides: RideRecord[] }) {
  const { total, byDay, lastWeekTotal, today } = useMemo(() => weekDelays(rides), [rides])
  const max = Math.max(1, ...byDay)
  const router = useRouter()
  // No rides yet: a dash instead of a 0 that reads like a delay-free week
  const hasRides = rides.length > 0

  return (
    <MetricCard
      icon={<ClockIcon color={statsPalette.tomato} />}
      color={statsPalette.tomato}
      title={translate("statistics.weekDelays")}
      value={hasRides ? String(total) : "—"}
      unit={hasRides ? translate("statistics.minutesUnit") : undefined}
      helper={hasRides ? translate("statistics.lastWeekDelays", { count: lastWeekTotal }) : undefined}
      onPress={hasRides ? () => router.push("/statistics/week-delays") : undefined}
      accessory={
        <View style={styles.miniBars}>
          {byDay.map((minutes, day) => (
            <View
              key={day}
              style={[
                styles.miniBar,
                { height: Math.max(3, (minutes / max) * MINI_BAR_HEIGHT) },
                day <= today && minutes > 0 && styles.miniBarDelayed,
                day > today && styles.miniBarFuture,
              ]}
            />
          ))}
        </View>
      }
    />
  )
}

function OnTimeCard({ percent, averageDelay }: { percent: number; averageDelay: number }) {
  const router = useRouter()
  return (
    <MetricCard
      icon={<CheckIcon color={statsPalette.accent} />}
      color={statsPalette.accent}
      title={translate("statistics.onTime")}
      value={`${percent}%`}
      helper={translate("statistics.averageDelay", { count: averageDelay })}
      onPress={() => router.push({ pathname: "/statistics/history", params: { metric: "onTime" } })}
      accessory={<ProgressRing progress={percent / 100} color={statsPalette.accent} />}
    />
  )
}

const RING_SIZE = 40
const RING_STROKE = 6

function ProgressRing({ progress, color }: { progress: number; color: string }) {
  const radius = (RING_SIZE - RING_STROKE) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={statsPalette.track}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={radius}
        stroke={color}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${circumference * Math.min(1, progress)} ${circumference}`}
      />
    </Svg>
  )
}

function ClockIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={7} fill={color} />
      <Path d="M7 3.5V7l2.4 1.5" stroke={statsPalette.background} strokeWidth={1.6} strokeLinecap="round" fill="none" />
    </Svg>
  )
}

function CheckIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      <Circle cx={7} cy={7} r={7} fill={color} />
      <Path
        d="M4 7.2l2 2 4-4.2"
        stroke={statsPalette.background}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

function ProgressBar({ progress, color, style }: { progress: number; color?: string; style?: ViewStyle }) {
  return (
    <View style={[styles.progressTrack, style]}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(Math.min(1, progress) * 100)}%` },
          color && { backgroundColor: color },
        ]}
      />
    </View>
  )
}

/** Styled after the home-screen widget: station photo, route, and the big departure time */
function UsualTrainCard({
  originId,
  destinationId,
  departureTime,
  count,
}: {
  originId: string
  destinationId: string
  departureTime: number
  count: number
}) {
  const router = useRouter()
  const image = stationsObject[originId]?.image
  const openDetails = () => {
    router.push({
      pathname: "/statistics/usual-train",
      params: { originId, destinationId, departureTime: String(departureTime) },
    })
  }

  return (
    <PressableCard onPress={openDetails} style={styles.usualCard}>
      <ImageBackground source={image} style={styles.usualBackground}>
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={["rgba(16, 21, 58, 0.75)", "rgba(16, 21, 58, 0.5)", "rgba(16, 21, 58, 0.92)"]}
        />
        <View style={styles.usualContent}>
          <StatsDisplayText englishSize={20} style={styles.usualLabel} tx="statistics.usualTrain" />
          <Text style={styles.usualTime} maxFontSizeMultiplier={1.1}>
            {formatTime(departureTime)}
          </Text>
          <View style={styles.usualFooter}>
            <View style={styles.usualRoute}>
              <Text style={styles.usualOrigin} numberOfLines={1}>
                {stationName(originId)}
              </Text>
              <View style={styles.usualDestinationRow}>
                <View style={styles.usualArrowCircle}>
                  <Image source={arrowIcon} style={styles.usualArrowIcon} />
                </View>
                <Text style={styles.usualDestination} numberOfLines={1}>
                  {stationName(destinationId)}
                </Text>
              </View>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {formatNumber(count)} {translate("statistics.ridesLabel")?.toLowerCase()}
              </Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </PressableCard>
  )
}

const achievementCopy: Record<Achievement["kind"], { title: TxKeyPath; remaining: TxKeyPath; icon: string }> = {
  stations: { title: "statistics.achievementStations", remaining: "statistics.remainingStations", icon: "🚉" },
  rides: { title: "statistics.achievementRides", remaining: "statistics.remainingRides", icon: "🎫" },
}

function AchievementCard({ achievement }: { achievement: Achievement | undefined }) {
  const copy = achievement && achievementCopy[achievement.kind]
  return (
    <Card style={styles.achievementCard}>
      <View style={styles.badge}>
        <Text style={styles.badgeIcon}>{copy?.icon ?? "🏆"}</Text>
      </View>
      <View style={styles.achievementContent}>
        <StatsDisplayText englishSize={20} style={styles.cardTitle} tx="statistics.nextAchievement" />
        {achievement && copy ? (
          <>
            <Text style={styles.achievementTitle} numberOfLines={1}>
              {translate(copy.title)} · {translate(copy.remaining, { count: achievement.target - achievement.value })}
            </Text>
            <ProgressBar
              progress={achievement.value / achievement.target}
              color={statsPalette.orange}
              style={styles.achievementBar}
            />
          </>
        ) : (
          <Text style={styles.achievementTitle} tx="statistics.allDone" />
        )}
      </View>
    </Card>
  )
}

/** Shown above the zeroed stats until the first ride is recorded */
function EmptyHint() {
  return (
    <Card style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>🚆</Text>
      <View style={styles.emptyBody}>
        <StatsDisplayText englishSize={22} style={styles.emptyTitle} tx="statistics.emptyTitle" />
        <Text style={styles.emptyText} tx="statistics.emptyMessage" />
      </View>
    </Card>
  )
}

const cardRadius = isLiquidGlassSupported ? 22 : 16

const styles = StyleSheet.create((theme, rt) => ({
  profile: {
    alignItems: "center",
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[5],
    gap: theme.spacing[3],
  },
  badgeTile: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderCurve: "continuous",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4144BC",
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  badgeTilePressed: {
    transform: [{ scale: 0.95 }],
  },
  badgeTileShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  badgeTileEmoji: {
    fontSize: 52,
    lineHeight: 64,
  },
  profileRank: {
    color: statsPalette.text,
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
  },
  profilePills: {
    flexDirection: "row",
    gap: theme.spacing[2],
  },
  pillAccent: {
    backgroundColor: statsPalette.accent,
  },
  pillAccentText: {
    color: statsPalette.background,
  },
  rankProgress: {
    alignSelf: "stretch",
    gap: theme.spacing[2],
    alignItems: "center",
    marginTop: theme.spacing[1],
  },
  card: {
    borderRadius: cardRadius,
    borderCurve: "continuous",
    backgroundColor: statsPalette.card,
    marginBottom: theme.spacing[3],
    overflow: "hidden",
  },
  glassCard: {
    backgroundColor: "transparent",
    overflow: "visible",
  },
  cardPressed: {
    opacity: 0.85,
  },
  screen: {
    paddingTop: 0,
  },
  hero: {
    alignItems: "center",
    marginHorizontal: -theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  heroSvg: {
    position: "absolute",
    top: -HERO_OVERSCROLL,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: "800",
    color: statsPalette.text,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
    // Offsets Heebo's tall descender space so the label sits close
    ...(Platform.OS !== "ios" && { lineHeight: 80, marginBottom: -theme.spacing[3] }),
  },
  heroLabel: {
    color: statsPalette.text,
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.9,
  },
  heroPill: {
    marginTop: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 999,
    backgroundColor: "rgba(16, 21, 58, 0.28)",
  },
  heroPillText: {
    color: statsPalette.text,
    fontSize: 13,
    fontWeight: "600",
  },
  historyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    minHeight: 44,
    marginTop: theme.spacing[1],
    paddingHorizontal: theme.spacing[4],
  },
  historyLinkText: {
    color: statsPalette.accentSoft,
    fontSize: 15,
    fontWeight: "600",
  },
  historyChevron: {
    tintColor: statsPalette.accentSoft,
    marginEnd: 0,
    width: 6,
    height: 12,
  },
  pill: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 999,
    backgroundColor: statsPalette.pill,
  },
  pillText: {
    color: statsPalette.accentSoft,
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: statsPalette.muted,
  },
  metricCard: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexShrink: 1,
  },
  metricTitle: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
  },
  metricChevron: {
    tintColor: statsPalette.muted,
    marginEnd: 0,
    width: 6,
    height: 12,
  },
  metricBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: theme.spacing[3],
  },
  metricReading: {
    flexShrink: 1,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[1],
    flexWrap: "wrap",
  },
  metricValue: {
    fontSize: 34,
    fontWeight: "700",
    color: statsPalette.text,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
  },
  metricUnit: {
    fontSize: 15,
    fontWeight: "600",
    color: statsPalette.muted,
  },
  activityBars: {
    width: 88,
    height: 40,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginBottom: theme.spacing[1],
  },
  activityBar: {
    flex: 1,
    borderRadius: 2,
  },
  miniBars: {
    height: MINI_BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  miniBar: {
    width: 6,
    borderRadius: 2,
    backgroundColor: statsPalette.track,
  },
  miniBarDelayed: {
    backgroundColor: statsPalette.tomato,
  },
  miniBarFuture: {
    opacity: 0.4,
  },
  ring: {
    transform: [{ rotate: "-90deg" }],
  },
  cardFootnote: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: statsPalette.track,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: statsPalette.accent,
  },
  usualCard: {
    backgroundColor: statsPalette.cardRaised,
  },
  usualBackground: {
    minHeight: 170,
    borderRadius: cardRadius,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  usualContent: {
    flex: 1,
    padding: theme.spacing[4],
    justifyContent: "space-between",
  },
  usualLabel: {
    color: statsPalette.orange,
    fontSize: 14,
    fontWeight: "700",
  },
  usualTime: {
    color: statsPalette.text,
    fontSize: 52,
    fontWeight: "800",
    lineHeight: 60,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
    marginVertical: theme.spacing[1],
  },
  usualFooter: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing[3],
  },
  usualRoute: {
    flex: 1,
    gap: 2,
  },
  usualOrigin: {
    color: statsPalette.text,
    fontSize: 17,
    fontWeight: "700",
  },
  usualDestinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  // Same arrow as the voucher hero and the widget previews
  usualArrowCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: statsPalette.text,
  },
  usualArrowIcon: {
    width: 9,
    height: 9,
    tintColor: "#000000",
    // The asset points left, which is forward in right-to-left layouts
    transform: rt.rtl ? undefined : [{ rotate: "180deg" }],
  },
  usualDestination: {
    flexShrink: 1,
    color: statsPalette.text,
    fontSize: 15,
    fontWeight: "500",
    opacity: 0.85,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    padding: theme.spacing[4],
  },
  achievementContent: {
    flex: 1,
    gap: theme.spacing[1],
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: statsPalette.cardRaised,
  },
  badgeIcon: {
    fontSize: 28,
  },
  achievementTitle: {
    color: statsPalette.text,
    fontSize: 17,
    fontWeight: "700",
  },
  achievementBar: {
    marginTop: theme.spacing[2],
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyBody: {
    flex: 1,
    gap: theme.spacing[1],
  },
  emptyTitle: {
    color: statsPalette.text,
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    color: statsPalette.muted,
    fontSize: 14,
  },
}))
