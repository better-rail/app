import { TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import type { RailLine } from "@/data/rail-lines"
import type { LineStatus, StationDeparture, StationDepartureDirection } from "@/services/api"
import { clockTime, levelLabel, stationName } from "../service-status-text"
import { contrastText } from "../service-status-theme"

/** How many upcoming trains a direction lists. */
const SHOWN = 3
/** Trains further off than this are listed by their time rather than a count of minutes. */
const MINUTES_AS_COUNTDOWN = 60

type LineDeparturesCardProps = {
  line: RailLine
  status: LineStatus | undefined
  /** Undefined while the board is loading; empty when nothing is due. */
  directions: StationDepartureDirection[] | undefined
  /** Israel's wall clock now, as a Date whose local fields are Israel time, for "in N min". */
  now: Date
  onPress: () => void
}

/**
 * One line calling at the station, after TfL Go's line cards: a band in the line's colour with its
 * name and level (tap it for the line's card), then the next trains each way, as a platform board
 * would list them.
 */
export function LineDeparturesCard({ line, status, directions, now, onPress }: LineDeparturesCardProps) {
  const ink = line.textColor ?? contrastText(line.color)
  return (
    <View style={styles.card} testID={`station-line-${line.id}`}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        style={[styles.band, { backgroundColor: line.color }]}
      >
        <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
          {line.name[userLocale]}
        </Text>
        <Text style={[styles.level, { color: ink }]} numberOfLines={1}>
          {status ? levelLabel(status.level) : translate("serviceStatus.levels.noService")}
        </Text>
      </TouchableOpacity>
      {directions === undefined && (
        <Text style={styles.empty} preset="small">
          …
        </Text>
      )}
      {directions !== undefined && directions.length === 0 && (
        <Text style={styles.empty} preset="small" tx="serviceStatus.station.noDepartures" />
      )}
      {directions?.map((direction) => (
        <DirectionRow key={direction.towardsStationId} direction={direction} now={now} />
      ))}
    </View>
  )
}

/**
 * One direction of the line, as a platform board lists it: where the trains head and the next one's
 * platform, then a pill per upcoming train with its time. The first pill also says how soon it is.
 */
function DirectionRow({ direction, now }: { direction: StationDepartureDirection; now: Date }) {
  const trains = direction.trains.slice(0, SHOWN)
  const next = trains.find((t) => !t.cancelled)
  // Where the next train actually goes, as a platform board says it, even when it ends short of the line's end.
  const towards = next?.destinationStationId ?? direction.towardsStationId
  return (
    <View style={styles.direction} testID={`station-direction-${direction.towardsStationId}`}>
      <View style={styles.directionHeader}>
        <Text style={styles.towards} numberOfLines={1}>
          {translate("serviceStatus.station.towards", { station: stationName(towards) })}
        </Text>
        {next && next.platform > 0 && (
          <Text style={styles.detail} preset="small" numberOfLines={1}>
            {translate("serviceStatus.station.platform", { platform: next.platform })}
          </Text>
        )}
      </View>
      <View style={styles.trains}>
        {trains.map((train) => (
          <TrainPill key={train.time} train={train} countdown={train === next ? minutesUntil(train, now) : null} />
        ))}
      </View>
    </View>
  )
}

/**
 * One train's time. The next train to leave also gets a countdown ("51 min", "now") while it is
 * within the hour; a late train shows its delay after the time; a cancelled one is struck through.
 */
function TrainPill({ train, countdown }: { train: StationDeparture; countdown: number | null }) {
  const soon = countdown !== null && countdown <= MINUTES_AS_COUNTDOWN
  return (
    <View style={[styles.pill, countdown !== null && styles.nextPill]}>
      <Text
        style={[
          styles.pillTime,
          countdown !== null && styles.nextPillTime,
          countdown !== null && train.live && styles.live,
          train.cancelled && styles.cancelled,
        ]}
        maxFontSizeMultiplier={1.3}
      >
        {clockTime(train.time)}
        {train.delayMinutes > 0 && !train.cancelled ? <Text style={styles.delay}>{` +${train.delayMinutes}`}</Text> : null}
      </Text>
      {train.cancelled && (
        <Text style={styles.pillNote} preset="small" tx="serviceStatus.cancelled" maxFontSizeMultiplier={1.3} />
      )}
      {soon && !train.cancelled && (
        <Text style={styles.pillNote} preset="small" maxFontSizeMultiplier={1.3}>
          {countdown === 0
            ? translate("plan.now")
            : (translate("serviceStatus.station.minutesList", { minutes: countdown }) ?? `${countdown}`)}
        </Text>
      )}
    </View>
  )
}

/** Minutes from now to the train's expected time, never negative. */
const minutesUntil = (train: StationDeparture, now: Date): number => {
  const expected = new Date(train.time).getTime() + train.delayMinutes * 60_000
  return Math.max(0, Math.round((expected - now.getTime()) / 60_000))
}

const styles = StyleSheet.create((theme) => ({
  card: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.tertiaryBackground,
  },
  band: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    gap: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  level: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
  },
  empty: {
    color: theme.colors.label,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  direction: {
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.separator,
  },
  directionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[2],
  },
  towards: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    color: theme.colors.label,
  },
  trains: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  pill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 30,
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  nextPill: {
    paddingHorizontal: theme.spacing[3],
  },
  pillTime: {
    fontSize: 15,
    fontVariant: ["tabular-nums"],
  },
  nextPillTime: {
    fontWeight: "700",
  },
  live: {
    color: theme.colors.success,
  },
  cancelled: {
    color: theme.colors.label,
    textDecorationLine: "line-through",
  },
  delay: {
    color: theme.colors.destroy,
    fontWeight: "600",
  },
  pillNote: {
    color: theme.colors.label,
  },
}))
