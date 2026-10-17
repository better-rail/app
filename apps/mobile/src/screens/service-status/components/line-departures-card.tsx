import { TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate, userLocale } from "@/i18n"
import type { RailLine } from "@/data/rail-lines"
import type { LineStatus, StationDeparture, StationDepartureDirection } from "@/services/api"
import { clockTime, levelLabel, stationName } from "../service-status-text"
import { contrastText, useStatusLevelInk } from "../service-status-theme"

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
  const name = line.name[userLocale]
  const level = status ? levelLabel(status.level) : (translate("serviceStatus.levels.noService") ?? "")
  return (
    <View style={styles.card} testID={`station-line-${line.id}`}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${level}`}
        style={[styles.band, { backgroundColor: line.color }]}
      >
        <Text style={[styles.name, { color: ink }]} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.level, { color: ink }]} numberOfLines={1}>
          {level}
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
 * platform, then a line per upcoming train. The first also says how soon it is.
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
          <TrainRow key={train.time} train={train} countdown={train === next ? minutesUntil(train, now) : null} />
        ))}
      </View>
    </View>
  )
}

/**
 * One train on the board. The next train leads with how soon it is ("7 min", "now"), in green
 * while that is live, and its scheduled time follows quietly; the others lead with their time.
 * A late train shows its delay after the time, and a cancelled one is struck through and says so.
 */
function TrainRow({ train, countdown }: { train: StationDeparture; countdown: number | null }) {
  const goodInk = useStatusLevelInk("goodService")
  const lateInk = useStatusLevelInk("severeDelays")
  const isNext = countdown !== null && !train.cancelled
  const live = isNext && train.live
  const soon = isNext && countdown <= MINUTES_AS_COUNTDOWN
  const time = clockTime(train.time)
  const late = train.delayMinutes > 0 && !train.cancelled
  const note = train.cancelled
    ? translate("serviceStatus.cancelled")
    : soon
      ? countdown === 0
        ? translate("plan.now")
        : translate("serviceStatus.station.minutesList", { minutes: countdown })
      : null
  const spoken = [
    time,
    late ? translate("serviceStatus.minutesLate", { minutes: train.delayMinutes }) : null,
    live ? translate("serviceStatus.station.live") : null,
    note,
  ]
    .filter(Boolean)
    .join(", ")

  // The countdown leads the next train's line; the time then steps back, with its delay still on it.
  const countdownLeads = soon && note !== null
  const timeText = (small: boolean) => (
    <Text
      style={[
        styles.time,
        small && styles.timeSmall,
        isNext && !small && styles.nextTime,
        live && !small && { color: goodInk },
        train.cancelled && styles.cancelled,
      ]}
      maxFontSizeMultiplier={1.3}
    >
      {time}
      {late ? (
        <Text style={[small ? styles.delaySmall : styles.delay, { color: lateInk }]} maxFontSizeMultiplier={1.3}>
          {` +${train.delayMinutes}`}
        </Text>
      ) : null}
    </Text>
  )

  return (
    <View style={styles.train} accessible accessibilityLabel={spoken}>
      {countdownLeads ? (
        <>
          <Text style={[styles.lead, live && { color: goodInk }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {note}
          </Text>
          {timeText(true)}
        </>
      ) : (
        <>
          {timeText(false)}
          {note && (
            <Text style={[styles.note, train.cancelled && { color: lateInk }]} numberOfLines={1} maxFontSizeMultiplier={1.3}>
              {note}
            </Text>
          )}
        </>
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
    gap: 0,
  },
  // A line of the board: what leads (a countdown or a time), then what follows it quietly.
  train: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[2],
  },
  lead: {
    fontSize: 17,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  time: {
    fontSize: 17,
    fontVariant: ["tabular-nums"],
  },
  timeSmall: {
    fontSize: 14,
    color: theme.colors.label,
  },
  nextTime: {
    fontWeight: "700",
  },
  cancelled: {
    color: theme.colors.label,
    textDecorationLine: "line-through",
  },
  delay: {
    fontSize: 13,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  delaySmall: {
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  note: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.label,
  },
}))
