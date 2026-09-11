import { ActivityIndicator, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNetworkState } from "expo-network"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { compareServiceStatusLevels, isDisruptedLevel, type ServiceStatusLevel } from "@/services/api"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { BAR_WIDTH, LineStatusRow } from "./line-status-row"
import { StatusError } from "./status-error"
import { levelLabel } from "../service-status-text"
import { contrastText, useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

/**
 * Levels summed up in one band under the disrupted lines' rows, without naming the lines. Lines with
 * no trains scheduled right now are not a disruption, so they are left out; the map still has them.
 */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "unknown"]

type LineListProps = {
  onSelectLine: (lineId: string) => void
}

/**
 * Every line's status, as TfL Go lays it out: the disrupted ones on full-width rows, worst first,
 * and a band in the level's colour for the rest, filling the sheet down to its bottom edge.
 */
export function LineList({ onSelectLine }: LineListProps) {
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, refetch } = useServiceStatus()

  const lines = data?.lines ?? []
  const disrupted = lines.filter((l) => isDisruptedLevel(l.level)).sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const grouped = GROUPED_LEVELS.filter((level) => lines.some((l) => l.level === level))
  // Nothing runs right now (the small hours, the weekend): say so, instead of an empty list.
  const nothingRunning = data !== undefined && disrupted.length === 0 && grouped.length === 0

  return (
    <View style={styles.list} testID="service-status-list">
      {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
      {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

      {disrupted.map((line) => (
        <LineStatusRow key={line.lineId} status={line} onPress={() => onSelectLine(line.lineId)} />
      ))}

      {grouped.map((level, index) => (
        <LevelBand
          key={level}
          level={level}
          onlyGroup={disrupted.length === 0 && grouped.length === 1}
          fill={index === grouped.length - 1}
        />
      ))}

      {nothingRunning && (
        <LevelBand level="noService" onlyGroup fill description={translate("serviceStatus.noServiceNow") ?? ""} />
      )}
    </View>
  )
}

type LevelBandProps = {
  level: ServiceStatusLevel
  /** Nothing is disrupted, so the level is the whole network's headline. */
  onlyGroup: boolean
  /** The last band: it runs on down to the bottom of the sheet. */
  fill?: boolean
  description?: string
}

/** TfL Go's "Other lines — Good service" band: the level the rest of the lines share, on its colour. */
function LevelBand({ level, onlyGroup, fill, description }: LevelBandProps) {
  const levelColor = useStatusLevelColor(level)
  const ink = { color: contrastText(levelColor) }
  return (
    <View
      style={[styles.band, { backgroundColor: levelColor }, fill && styles.bandFill]}
      testID={`service-status-group-${level}`}
    >
      {onlyGroup ? (
        <Text style={[styles.bandTitle, ink]}>{levelLabel(level)}</Text>
      ) : (
        <>
          <Text style={[styles.bandTitle, ink]} tx="serviceStatus.otherLines" />
          <Text style={[styles.bandLevel, ink]}>{levelLabel(level)}</Text>
        </>
      )}
      {description && <Text style={[styles.bandDescription, ink]}>{description}</Text>}
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
  bandDescription: {
    fontSize: 15,
    opacity: 0.85,
  },
}))
