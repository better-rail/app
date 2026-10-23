import { ActivityIndicator, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNetworkState } from "expo-network"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { RAIL_LINES } from "@/data/rail-lines"
import {
  compareServiceStatusLevels,
  isDisruptedLevel,
  type LineStatus,
  type ServiceStatusLevel,
  type ServiceStatusSnapshot,
} from "@/services/api"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { BAR_WIDTH, LineStatusRow } from "./line-status-row"
import { LiveIndicator } from "./live-indicator"
import { StatusError } from "./status-error"
import { levelLabel } from "../service-status-text"
import { contrastText, tinted, useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

/**
 * Levels summed up in one band under the disrupted lines' rows, without naming the lines. Lines with
 * no trains scheduled right now are not a disruption, so they are left out.
 */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "unknown"]

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

type LineListProps = {
  /** The rider's own lines (the route planned, the favourites), brought up first in this order. */
  userLineIds: string[]
  onSelectLine: (lineId: string) => void
}

/**
 * Every line's status, as TfL Go lays it out: a headline for the whole network, the rider's own lines
 * first, then the disrupted ones on full-width rows, worst first, and a band in the level's colour for
 * the rest. With nothing disrupted there is no "rest" to band together: every running line gets a row.
 */
export function LineList({ userLineIds, onSelectLine }: LineListProps) {
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, refetch } = useServiceStatus()

  const lines = data?.lines ?? []
  const mine = userLineIds.map((id) => lines.find((l) => l.lineId === id)).filter((l): l is LineStatus => !!l)
  const others = lines.filter((l) => !userLineIds.includes(l.lineId))
  const disrupted = others.filter((l) => isDisruptedLevel(l.level)).sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const running = others.filter((l) => GROUPED_LEVELS.includes(l.level)).sort((a, b) => catalogueIndex(a) - catalogueIndex(b))
  const grouped = GROUPED_LEVELS.filter((level) => running.some((l) => l.level === level))
  const anyDisrupted = lines.some((l) => isDisruptedLevel(l.level))
  // Nothing runs right now (the small hours, the weekend): say so, instead of an empty list.
  const nothingRunning = data !== undefined && !lines.some((l) => isDisruptedLevel(l.level) || GROUPED_LEVELS.includes(l.level))
  // Nothing is wrong: a word saying so, and every running line on a row of its own rather than one band.
  const allClear = data !== undefined && !anyDisrupted && !nothingRunning

  return (
    <View style={styles.list} testID="service-status-list">
      {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
      {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

      {data && <NetworkHeadline snapshot={data} nothingRunning={nothingRunning} />}

      {mine.length > 0 && (
        <View style={styles.mine} testID="service-status-user-lines">
          {mine.map((line) => (
            <LineStatusRow
              key={line.lineId}
              status={line}
              compact={!isDisruptedLevel(line.level)}
              onPress={() => onSelectLine(line.lineId)}
            />
          ))}
        </View>
      )}

      {disrupted.map((line) => (
        <LineStatusRow key={line.lineId} status={line} onPress={() => onSelectLine(line.lineId)} />
      ))}

      {anyDisrupted && grouped.map((level) => <LevelBand key={level} level={level} />)}

      {allClear &&
        running.map((line) => (
          <LineStatusRow key={line.lineId} status={line} compact onPress={() => onSelectLine(line.lineId)} />
        ))}
    </View>
  )
}

/** Where the line sits in the catalogue, so a list of lines keeps the map's order. */
const catalogueIndex = (status: LineStatus): number => {
  const index = RAIL_LINES.findIndex((line) => line.id === status.lineId)
  return index === -1 ? RAIL_LINES.length : index
}

/** "212 trains running", when any are. */
const activeTrains = (lines: LineStatus[]): string | undefined => {
  const count = lines.reduce((sum, line) => sum + line.trains.active, 0)
  return count > 0 ? (translate("serviceStatus.trainsActive", { count }) ?? undefined) : undefined
}

type NetworkHeadlineProps = {
  snapshot: ServiceStatusSnapshot
  nothingRunning: boolean
}

/**
 * The whole network in a line: that all is well, how many lines are disrupted, or that nothing runs
 * right now, with how live the data is.
 */
function NetworkHeadline({ snapshot, nothingRunning }: NetworkHeadlineProps) {
  const disruptedCount = snapshot.lines.filter((l) => isDisruptedLevel(l.level)).length
  const allGood = snapshot.lines.length > 0 && snapshot.lines.every((l) => l.level === "goodService" || l.level === "noService")
  if (nothingRunning) {
    return (
      <NetworkSummary
        level="noService"
        title={levelLabel("noService")}
        detail={translate("serviceStatus.noServiceNow") ?? undefined}
        realtime={snapshot.realtime}
      />
    )
  }
  if (disruptedCount > 0) {
    return (
      <NetworkSummary
        level={snapshot.network.level}
        title={
          (disruptedCount === 1
            ? translate("serviceStatus.disruptedLine")
            : translate("serviceStatus.disruptedLines", { count: disruptedCount })) ?? ""
        }
        detail={activeTrains(snapshot.lines)}
        realtime={snapshot.realtime}
      />
    )
  }
  return (
    <NetworkSummary
      level={allGood ? "goodService" : "unknown"}
      title={allGood ? (translate("serviceStatus.allLinesGood") ?? "") : levelLabel("unknown")}
      detail={activeTrains(snapshot.lines)}
      realtime={snapshot.realtime}
    />
  )
}

type NetworkSummaryProps = {
  level: ServiceStatusLevel
  title: string
  detail?: string
  realtime: ServiceStatusSnapshot["realtime"]
}

/** The headline: a check (or a dot) in the level's colour, a few words, and how live the data is. */
function NetworkSummary({ level, title, detail, realtime }: NetworkSummaryProps) {
  const levelColor = useStatusLevelColor(level)
  return (
    <View style={styles.summary} testID={`service-status-summary-${level}`}>
      <View style={[styles.summaryBadge, { backgroundColor: tinted(levelColor) }]}>
        {level === "goodService" ? (
          <Image source={CHECKMARK_ICON} style={[styles.summaryCheck, { tintColor: levelColor }]} />
        ) : (
          <View style={[styles.summaryDot, { backgroundColor: levelColor }]} />
        )}
      </View>
      <View style={styles.summaryTexts}>
        <Text style={styles.summaryTitle}>{title}</Text>
        {detail && (
          <Text style={styles.summaryDetail} preset="small">
            {detail}
          </Text>
        )}
        <LiveIndicator realtime={realtime} />
      </View>
    </View>
  )
}

/** TfL Go's "Other lines — Good service" band: the level the rest of the lines share, on its colour. */
function LevelBand({ level }: { level: ServiceStatusLevel }) {
  const levelColor = useStatusLevelColor(level)
  const ink = { color: contrastText(levelColor) }
  return (
    <View style={[styles.band, { backgroundColor: levelColor }]} testID={`service-status-group-${level}`}>
      <Text style={[styles.bandTitle, ink]} tx="serviceStatus.otherLines" />
      <Text style={[styles.bandLevel, ink]}>{levelLabel(level)}</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  list: {
    flex: 1,
  },
  loader: {
    marginVertical: theme.spacing[5],
  },
  // The rider's own lines stand a little apart from the rest of the board.
  mine: {
    marginBottom: theme.spacing[4],
    borderBottomWidth: theme.spacing[1],
    borderBottomColor: theme.colors.separator,
  },
  band: {
    // The text lines up with the rows', past their colour bars.
    paddingStart: BAR_WIDTH + theme.spacing[4],
    paddingEnd: theme.spacing[4],
    paddingVertical: theme.spacing[5],
    gap: theme.spacing[1],
  },
  bandTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  bandLevel: {
    fontSize: 16,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingStart: BAR_WIDTH + theme.spacing[4],
    paddingEnd: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  summaryBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCheck: {
    width: 18,
    height: 18,
  },
  summaryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  summaryTexts: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  summaryDetail: {
    color: theme.colors.label,
  },
}))
