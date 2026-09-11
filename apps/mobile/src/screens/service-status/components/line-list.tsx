import { ActivityIndicator, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useNetworkState } from "expo-network"
import { Text } from "@/components"
import { color } from "@/theme"
import { translate } from "@/i18n"
import { compareServiceStatusLevels, isDisruptedLevel, type LineStatus, type ServiceStatusLevel } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { RouteListError } from "@/screens/route-list/components/route-list-error"
import { LineBadge } from "./line-badge"
import { LineStatusRow } from "./line-status-row"
import { StatusError } from "./status-error"
import { levelLabel, levelDescription } from "../service-status-text"
import { useStatusLevelColor } from "../service-status-theme"
import { useServiceStatus } from "../use-service-status"

/**
 * Levels shown as a group of badges under the disrupted lines' rows. Lines with no trains
 * scheduled right now are not a disruption, so they are left out; the map still has them.
 */
const GROUPED_LEVELS: ServiceStatusLevel[] = ["goodService", "unknown"]

type LineListProps = {
  onSelectLine: (lineId: string) => void
}

/** Every line's status: the disrupted ones on rows of their own, worst first, the rest as badges under their shared level. */
export function LineList({ onSelectLine }: LineListProps) {
  const { isInternetReachable } = useNetworkState()
  const { data, isLoading, isError, refetch } = useServiceStatus()

  const lines = data?.lines ?? []
  const disrupted = lines.filter((l) => isDisruptedLevel(l.level)).sort((a, b) => compareServiceStatusLevels(b.level, a.level))
  const grouped = GROUPED_LEVELS.map((level) => ({ level, lines: lines.filter((l) => l.level === level) })).filter(
    (group) => group.lines.length > 0,
  )
  // Nothing runs right now (the small hours, the weekend): say so, instead of an empty list.
  const nothingRunning = data !== undefined && disrupted.length === 0 && grouped.length === 0

  return (
    <View style={styles.list} testID="service-status-list">
      {isLoading && <ActivityIndicator size="large" color="grey" style={styles.loader} />}
      {!isLoading && !data && isInternetReachable === false && <RouteListError errorType="no-internet" />}
      {!isLoading && !data && isError && isInternetReachable !== false && <StatusError onRetry={() => refetch()} />}

      {disrupted.length > 0 && (
        <View style={styles.group}>
          {disrupted.map((line, index) => (
            <LineStatusRow
              key={line.lineId}
              status={line}
              first={index === 0}
              last={index === disrupted.length - 1}
              onPress={() => onSelectLine(line.lineId)}
            />
          ))}
        </View>
      )}

      {grouped.map((group) => (
        <LevelGroup
          key={group.level}
          level={group.level}
          lines={group.lines}
          onlyGroup={disrupted.length === 0 && grouped.length === 1}
          onPressLine={onSelectLine}
        />
      ))}

      {nothingRunning && (
        <LevelGroup level="noService" lines={[]} onlyGroup description={translate("serviceStatus.noServiceNow") ?? ""} />
      )}
    </View>
  )
}

type LevelGroupProps = {
  level: ServiceStatusLevel
  lines: LineStatus[]
  /** Nothing is disrupted, so the level is the whole network's headline. */
  onlyGroup: boolean
  description?: string
  onPressLine?: (lineId: string) => void
}

/** TfL's "Other lines — Good service" band: one level, every line's badge. */
function LevelGroup({ level, lines, onlyGroup, description, onPressLine }: LevelGroupProps) {
  const levelColor = useStatusLevelColor(level)
  return (
    <View style={styles.levelGroup} testID={`service-status-group-${level}`}>
      {onlyGroup ? (
        <Text style={[styles.levelGroupTitle, { color: levelColor }]}>{levelLabel(level)}</Text>
      ) : (
        <>
          <Text style={styles.levelGroupTitle} tx="serviceStatus.otherLines" />
          <Text style={[styles.levelGroupLevel, { color: levelColor }]}>{levelLabel(level)}</Text>
        </>
      )}
      <Text style={styles.levelGroupDescription} preset="small">
        {description ?? levelDescription(level)}
      </Text>
      {lines.length > 0 && (
        <View style={styles.badges}>
          {lines.map((line) => {
            const catalogue = getRailLine(line.lineId) ?? { ...line.line, badgeStyle: "solid" as const, textColor: undefined }
            return (
              <TouchableHighlight
                key={line.lineId}
                underlayColor={color.inputPlaceholderBackground}
                onPress={() => onPressLine?.(line.lineId)}
                style={styles.badgeTouchable}
                testID={`service-status-line-${line.lineId}`}
                accessibilityRole="button"
                accessibilityLabel={getRailLine(line.lineId)?.name.en ?? line.line.name.en}
              >
                <LineBadge line={catalogue} size={36} />
              </TouchableHighlight>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  list: {
    gap: theme.spacing[4],
  },
  loader: {
    marginTop: theme.spacing[4],
  },
  group: {
    borderRadius: 14,
    overflow: "hidden",
  },
  levelGroup: {
    borderRadius: 14,
    backgroundColor: theme.colors.tertiaryBackground,
    padding: theme.spacing[4],
    gap: 2,
  },
  levelGroupTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  levelGroupLevel: {
    fontSize: 15,
    fontWeight: "500",
  },
  levelGroupDescription: {
    color: theme.colors.label,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
    marginTop: theme.spacing[2],
  },
  badgeTouchable: {
    borderRadius: 10,
  },
}))
