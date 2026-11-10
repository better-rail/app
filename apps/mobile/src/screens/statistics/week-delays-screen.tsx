import React, { useMemo, useRef, useState } from "react"
import { FlatList, Pressable, View, type ViewToken } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import HapticFeedback from "react-native-haptic-feedback"
import { useRouter } from "expo-router"
import { addDays, addWeeks, differenceInCalendarWeeks, endOfWeek, format } from "date-fns"
import { Text } from "@/components"
import { StatsScreen } from "./stats-screen"
import { StatsDisplayText } from "./stats-display-text"
import { stationLocale, stationsObject } from "@/data/stations"
import { dateFnsLocalization, isRTL, translate } from "@/i18n"
import { useRideHistoryStore, type RideRecord } from "@/models"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { firstRideDate, weekDelays } from "./compute-stats"
import { statsNumberFont, statsPalette } from "./statistics-palette"
import { NumericText } from "./numeric-text"

const stationName = (id: string) => stationsObject[id]?.[stationLocale] ?? ""

const CHART_HEIGHT = 140
const MIN_BAR_HEIGHT = 6

const MAX_WEEKS = 52

export function WeekDelaysScreen() {
  const rides = useRideHistoryStore((state) => state.rides)
  // Newest first; past weeks are measured at their Saturday's end, so every day counts as elapsed
  const weeks = useMemo(() => {
    const now = new Date()
    const first = firstRideDate(rides) ?? now.getTime()
    const count = Math.min(MAX_WEEKS, Math.max(1, differenceInCalendarWeeks(now, first) + 1))
    return Array.from({ length: count }, (_, offset) => weekDelays(rides, offset === 0 ? now : endOfWeek(addWeeks(now, -offset))))
  }, [rides])
  const [selected, setSelected] = useState(0)
  const [scrubbedDay, setScrubbedDay] = useState<number>()
  const week = weeks[Math.min(selected, weeks.length - 1)]
  const isCurrentWeek = selected === 0
  const shownTotal = scrubbedDay === undefined ? week.total : week.byDay[scrubbedDay]
  const difference = week.total - week.lastWeekTotal
  const worstDelay = Math.max(0, ...week.delayedRides.map((ride) => ride.delay))

  const comparison =
    difference > 0
      ? translate("statistics.weekDelaysMore", { count: difference })
      : difference < 0
        ? translate("statistics.weekDelaysLess", { count: -difference })
        : translate("statistics.weekDelaysSame")
  const weekRange = `${format(week.weekStart, "d MMM", { locale: dateFnsLocalization })} – ${format(
    endOfWeek(week.weekStart),
    "d MMM",
    { locale: dateFnsLocalization },
  )}`

  return (
    <StatsScreen>
      <View style={[styles.card, styles.chartCard]}>
        <Text style={styles.note}>
          {scrubbedDay !== undefined
            ? format(addDays(week.weekStart, scrubbedDay), "EEEE, d MMM", { locale: dateFnsLocalization })
            : isCurrentWeek
              ? comparison
              : weekRange}
        </Text>
        <NumericText
          value={shownTotal}
          style={styles.bigValue}
          unit={translate("statistics.minutesUnit")}
          unitStyle={styles.bigValueUnit}
          fillWidth
        >
          {String(shownTotal)}
        </NumericText>
        <WeekPager weeks={weeks} onSelect={setSelected} scrubbedDay={scrubbedDay} onScrub={setScrubbedDay} />
        <Text style={styles.note} tx="statistics.weekDelaysNote" />
      </View>

      <View style={styles.card}>
        <View style={styles.totals}>
          <Total value={`${week.delayedRides.length}/${week.rideCount}`} label={translate("statistics.delayedRides")} />
          <View style={styles.totalsDivider} />
          <Total
            value={String(worstDelay)}
            unit={translate("statistics.minutesUnit")}
            label={translate("statistics.worstDelay")}
          />
          <View style={styles.totalsDivider} />
          <Total
            value={String(week.lastWeekTotal)}
            unit={translate("statistics.minutesUnit")}
            label={translate("statistics.lastWeek")}
          />
        </View>
      </View>

      {week.delayedRides.length > 0 ? (
        <>
          <StatsDisplayText
            englishSize={24}
            style={styles.sectionTitle}
            tx={isCurrentWeek ? "statistics.delayedRidesTitle" : "statistics.delayedRides"}
          />
          <View style={[styles.card, styles.rides]}>
            {week.delayedRides.map((ride, index) => (
              <DelayedRide key={ride.id} ride={ride} first={index === 0} />
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.empty} tx={isCurrentWeek ? "statistics.noDelaysThisWeek" : "statistics.noDelaysThatWeek"} />
      )}
    </StatsScreen>
  )
}

type Week = ReturnType<typeof weekDelays>

/** A page per week, oldest first and opening on the current week, so swiping goes back in time like the Health app */
function WeekPager({
  weeks,
  onSelect,
  scrubbedDay,
  onScrub,
}: {
  weeks: Week[]
  onSelect: (index: number) => void
  scrubbedDay: number | undefined
  onScrub: (day: number | undefined) => void
}) {
  const [width, setWidth] = useState(0)
  const pages = useMemo(() => [...weeks].reverse(), [weeks])
  const pageCount = useRef(pages.length)
  pageCount.current = pages.length
  // Reads the page from the list rather than the scroll offset, which RTL mirrors
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken<Week>[] }) => {
    const page = viewableItems[0]?.index
    if (page != null) onSelect(pageCount.current - 1 - page)
  })

  return (
    <View style={styles.pager} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          data={pages}
          extraData={scrubbedDay}
          keyExtractor={(week) => String(week.weekStart)}
          horizontal
          pagingEnabled
          // Holding still to scrub must not turn into a page swipe
          scrollEnabled={scrubbedDay === undefined}
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={pages.length - 1}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged.current}
          renderItem={({ item }) => (
            <View style={[styles.page, { width }]}>
              <DayBars
                byDay={item.byDay}
                // Past weeks are measured at their end, so only the current week has a today
                today={item === weeks[0] ? item.today : undefined}
                weekStart={item.weekStart}
                width={width}
                scrubbedDay={scrubbedDay}
                onScrub={onScrub}
              />
            </View>
          )}
        />
      )}
    </View>
  )
}

const viewabilityConfig = { itemVisiblePercentThreshold: 60 }

/**
 * A bar per weekday; `today` is set only on the current week, to highlight it and dim the days ahead.
 * A long press then drag scrubs across the days, so a quick swipe still pages between weeks.
 */
function DayBars({
  byDay,
  today,
  weekStart,
  width,
  scrubbedDay,
  onScrub,
}: {
  byDay: number[]
  today?: number
  weekStart: number
  width: number
  scrubbedDay: number | undefined
  onScrub: (day: number | undefined) => void
}) {
  const { theme } = useUnistyles()
  const max = Math.max(1, ...byDay)
  const lastDay = useRef<number | undefined>(undefined)
  const padding = theme.spacing[4]
  const slot = (width - padding * 2 + theme.spacing[2]) / 7

  const scrubAt = (x: number) => {
    const position = Math.min(6, Math.max(0, Math.floor((x - padding) / slot)))
    const day = Math.min(isRTL ? 6 - position : position, today ?? 6)
    if (day === lastDay.current) return
    lastDay.current = day
    HapticFeedback.trigger("selection")
    onScrub(day)
  }
  const gesture = Gesture.Pan()
    .runOnJS(true)
    .activateAfterLongPress(200)
    .onStart((event) => scrubAt(event.x))
    .onUpdate((event) => scrubAt(event.x))
    .onFinalize(() => {
      lastDay.current = undefined
      onScrub(undefined)
    })

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.days}>
        {byDay.map((minutes, day) => (
          <View
            key={day}
            style={[
              styles.day,
              today !== undefined && day > today && styles.dayFuture,
              scrubbedDay !== undefined && day !== scrubbedDay && styles.dayDimmed,
            ]}
          >
            <View
              style={[
                styles.dayBar,
                { height: Math.max(MIN_BAR_HEIGHT, (minutes / max) * CHART_HEIGHT) },
                minutes > 0 && styles.dayBarDelayed,
              ]}
            />
            <Text
              style={[
                styles.dayLabel,
                (day === scrubbedDay || (scrubbedDay === undefined && day === today)) && styles.dayLabelToday,
              ]}
            >
              {format(addDays(weekStart, day), "EEEEEE", { locale: dateFnsLocalization })}
            </Text>
          </View>
        ))}
      </View>
    </GestureDetector>
  )
}

function DelayedRide({ ride, first }: { ride: RideRecord; first: boolean }) {
  const router = useRouter()
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/statistics/ride", params: { id: ride.id } })}
      style={({ pressed }) => [styles.ride, !first && styles.rideDivider, pressed && styles.pressed]}
    >
      <View style={styles.rideText}>
        <Text style={styles.rideRoute} numberOfLines={1}>
          {stationName(ride.originId)}
        </Text>
        <Text style={styles.rideRoute} numberOfLines={1}>
          {isRTL ? "←" : "→"} {stationName(ride.destinationId)}
        </Text>
        <Text style={styles.rideTime}>
          {format(ride.departureTime, "EEEE", { locale: dateFnsLocalization })} · {formatTime(ride.departureTime)}
        </Text>
      </View>
      <View style={styles.pill}>
        <Text style={styles.pillText}>{translate("statistics.lateBy", { count: ride.delay })}</Text>
      </View>
    </Pressable>
  )
}

function Total({ value, unit, label }: { value: string; unit?: string | null; label: string | null }) {
  return (
    <View style={styles.total}>
      <View style={styles.totalValueRow}>
        <Text style={styles.totalValue} maxFontSizeMultiplier={1.1}>
          {value}
        </Text>
        {unit && <Text style={styles.totalUnit}>{unit}</Text>}
      </View>
      <StatsDisplayText englishSize={17} style={styles.totalLabel} numberOfLines={1}>
        {label}
      </StatsDisplayText>
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
  chartCard: {
    padding: theme.spacing[4],
  },
  bigValue: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 56,
    fontVariant: ["tabular-nums"],
    ...statsNumberFont,
    color: statsPalette.tomato,
  },
  bigValueUnit: {
    fontSize: 22,
    fontWeight: "600",
    color: statsPalette.text,
  },
  pager: {
    marginHorizontal: -theme.spacing[4],
  },
  page: {
    justifyContent: "flex-end",
  },
  days: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: theme.spacing[2],
    marginVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  day: {
    flex: 1,
    alignItems: "center",
    gap: theme.spacing[1],
  },
  dayDimmed: {
    opacity: 0.35,
  },
  dayFuture: {
    opacity: 0.4,
  },
  dayBar: {
    alignSelf: "stretch",
    borderRadius: 4,
    borderCurve: "continuous",
    backgroundColor: statsPalette.track,
  },
  dayBarDelayed: {
    backgroundColor: statsPalette.tomato,
  },
  dayLabel: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  dayLabelToday: {
    color: statsPalette.text,
    fontWeight: "700",
  },
  note: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  totals: {
    flexDirection: "row",
    paddingVertical: theme.spacing[4],
  },
  total: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingHorizontal: theme.spacing[1],
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
    fontSize: 26,
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
  totalLabel: {
    fontSize: 13,
    color: statsPalette.muted,
  },
  sectionTitle: {
    color: statsPalette.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  rides: {
    paddingHorizontal: theme.spacing[4],
  },
  ride: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[3],
  },
  rideDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: statsPalette.track,
  },
  pressed: {
    opacity: 0.6,
  },
  rideText: {
    flex: 1,
    gap: 2,
  },
  rideRoute: {
    color: statsPalette.text,
    fontSize: 16,
    fontWeight: "600",
  },
  rideTime: {
    color: statsPalette.muted,
    fontSize: 14,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: 3,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "rgba(255, 99, 71, 0.18)",
  },
  pillText: {
    color: statsPalette.tomato,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  empty: {
    color: statsPalette.muted,
    textAlign: "center",
    fontSize: 16,
    marginTop: theme.spacing[4],
  },
}))
