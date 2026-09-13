import { ActivityIndicator, Image, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNetworkState } from "expo-network"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { RAIL_LINES } from "@/data/rail-lines"
import { compareServiceStatusLevels, isDisruptedLevel, type LineStatus, type ServiceStatusLevel } from "@/services/api"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { BAR_WIDTH, LineStatusRow } from "./line-status-row"
import { StatusError } from "./status-error"
import { levelLabel } from "../service-status-text"
import { contrastText, tinted, useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

/**
 * Levels summed up in one band under the disrupted lines' rows, without naming the lines. Lines with
 * no trains scheduled right now are not a disruption, so they are left out; the map still has them.
 */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "unknown"]

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

type LineListProps = {
  onSelectLine: (lineId: string) => void
}

/**
 * Every line's status, as TfL Go lays it out: the disrupted ones on full-width rows, worst first,
 * and a band in the level's colour for the rest, filling the sheet down to its bottom edge. With
 * nothing disrupted there is no "rest" to band together: a headline, then every running line's row.
 */
export function LineList({ onSelectLine }: LineListProps) {
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, refetch } = useServiceStatus()

  const lines = data?.lines ?? []
  const disrupted = lines.filter((l) => isDisruptedLevel(l.level)).sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const grouped = GROUPED_LEVELS.filter((level) => lines.some((l) => l.level === level))
  const running = lines.filter((l) => GROUPED_LEVELS.includes(l.level)).sort((a, b) => catalogueIndex(a) - catalogueIndex(b))
  // Nothing runs right now (the small hours, the weekend): say so, instead of an empty list.
  const nothingRunning = data !== undefined && disrupted.length === 0 && grouped.length === 0
  // Nothing is wrong: a word saying so, and every running line on a row of its own rather than one band.
  const allClear = disrupted.length === 0 && running.length > 0

  return (
    <View style={styles.list} testID="service-status-list">
      {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
      {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

      {disrupted.map((line) => (
        <LineStatusRow key={line.lineId} status={line} onPress={() => onSelectLine(line.lineId)} />
      ))}

      {!allClear &&
        grouped.map((level, index) => <LevelBand key={level} level={level} fill={index === grouped.length - 1} />)}

      {allClear && (
        <>
          <NetworkSummary
            level={running.every((l) => l.level === "goodService") ? "goodService" : "unknown"}
            title={
              running.every((l) => l.level === "goodService")
                ? (translate("serviceStatus.allLinesGood") ?? "")
                : levelLabel("unknown")
            }
            detail={activeTrains(running)}
          />
          {running.map((line) => (
            <LineStatusRow key={line.lineId} status={line} compact onPress={() => onSelectLine(line.lineId)} />
          ))}
        </>
      )}

      {nothingRunning && (
        <NetworkSummary level="noService" title={levelLabel("noService")} detail={translate("serviceStatus.noServiceNow") ?? undefined} />
      )}
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

type NetworkSummaryProps = {
  level: ServiceStatusLevel
  title: string
  detail?: string
}

/** The whole network's headline when nothing is disrupted: a check (or a dot) in the level's colour, and a word. */
function NetworkSummary({ level, title, detail }: NetworkSummaryProps) {
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
      </View>
    </View>
  )
}

type LevelBandProps = {
  level: ServiceStatusLevel
  /** The last band: it runs on down to the bottom of the sheet. */
  fill?: boolean
}

/** TfL Go's "Other lines — Good service" band: the level the rest of the lines share, on its colour. */
function LevelBand({ level, fill }: LevelBandProps) {
  const levelColor = useStatusLevelColor(level)
  const ink = { color: contrastText(levelColor) }
  return (
    <View
      style={[styles.band, { backgroundColor: levelColor }, fill && styles.bandFill]}
      testID={`service-status-group-${level}`}
    >
      <Text style={[styles.bandTitle, ink]} tx="serviceStatus.otherLines" />
      <Text style={[styles.bandLevel, ink]}>{levelLabel(level)}</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  list: {
    flex: 1,
  },
  loader: {
    marginVertical: theme.spacing[5],
  },
  band: {
    // The text lines up with the rows', past their colour bars.
    paddingStart: BAR_WIDTH + theme.spacing[4],
    paddingEnd: theme.spacing[4],
    paddingVertical: theme.spacing[5],
    gap: theme.spacing[1],
  },
  bandFill: {
    flexGrow: 1,
    paddingBottom: rt.insets.bottom + theme.spacing[5],
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
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[4],
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
