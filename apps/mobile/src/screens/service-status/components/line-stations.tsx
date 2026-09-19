import { TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useIsDarkMode } from "@/hooks"
import { color } from "@/theme"
import type { RailLine } from "@/data/rail-lines"
import { type DayType, SERVICE_PATTERNS } from "@/data/rail-map-layout"
import { compareServiceStatusLevels, type LineStatus, type ServiceStatusLevel } from "@/services/api"
import { levelLabel, stationName } from "../service-status-text"
import { STATUS_LEVEL_COLORS } from "../service-status-theme"

type LineStationsProps = {
  line: RailLine
  status: LineStatus | undefined
  dayType: DayType
  onSelectStation: (stationId: string) => void
}

/** A stop drawn on the strip: the line's own row per station it calls at on the day's timetable. */
type Stop = {
  stationId: string
  /** A fifth or more of the line's trains run through without calling. */
  irregular: boolean
  /** The worst disruption naming the station, if any. */
  level: ServiceStatusLevel | undefined
}

/**
 * The line's stations top to bottom, as a strip in its colour, like a route diagram on a platform:
 * where it calls and the stations a disruption names. Tap one for its card.
 */
export function LineStations({ line, status, dayType, onSelectStation }: LineStationsProps) {
  const isDark = useIsDarkMode()
  const stops = lineStops(line, status, dayType)

  return (
    <View style={styles.list} testID="line-stations">
      {stops.map((stop, index) => {
        const first = index === 0
        const last = index === stops.length - 1
        const levelColor = stop.level ? STATUS_LEVEL_COLORS[stop.level][isDark ? "dark" : "light"] : undefined
        return (
          <TouchableHighlight
            key={stop.stationId}
            underlayColor={color.inputPlaceholderBackground}
            onPress={() => onSelectStation(stop.stationId)}
            accessibilityRole="button"
            testID={`line-station-${stop.stationId}`}
          >
            <View style={styles.row}>
              <View style={styles.rail}>
                <View style={[styles.segment, { backgroundColor: first ? "transparent" : line.color }]} />
                <View style={[styles.segment, { backgroundColor: last ? "transparent" : line.color }]} />
                <View
                  style={[
                    styles.dot,
                    (first || last) && styles.terminalDot,
                    { borderColor: levelColor ?? line.color },
                    levelColor ? { backgroundColor: levelColor } : null,
                  ]}
                />
              </View>
              <View style={styles.texts}>
                <Text style={[styles.name, (first || last) && styles.terminalName]} numberOfLines={1}>
                  {stationName(stop.stationId)}
                </Text>
                {stop.level && (
                  <Text style={[styles.note, { color: levelColor }]} preset="small">
                    {levelLabel(stop.level)}
                  </Text>
                )}
                {!stop.level && stop.irregular && <Text style={styles.note} preset="small" tx="serviceStatus.someTrainsSkip" />}
              </View>
            </View>
          </TouchableHighlight>
        )
      })}
    </View>
  )
}

/** The stations the line calls at on the day's timetable, in its order, with what the strip marks on each. */
export const lineStops = (line: RailLine, status: LineStatus | undefined, dayType: DayType): Stop[] => {
  const pattern = SERVICE_PATTERNS[dayType]
  const skipped = new Set(pattern.skipped.filter((s) => s.lineId === line.id).map((s) => s.stationId))
  const irregular = new Set(pattern.irregular.filter((s) => s.lineId === line.id).map((s) => s.stationId))

  const levels = new Map<string, ServiceStatusLevel>()
  for (const disruption of status?.disruptions ?? []) {
    // Extra trains are good news, not something to flag on a station.
    if (disruption.level === "goodService" || !disruption.section) continue
    for (const stationId of disruption.section.stationIds) {
      const known = levels.get(stationId)
      if (!known || compareServiceStatusLevels(disruption.level, known) > 0) levels.set(stationId, disruption.level)
    }
  }

  return line.stationIds
    .filter((stationId) => !skipped.has(stationId))
    .map((stationId) => ({
      stationId,
      irregular: irregular.has(stationId),
      level: levels.get(stationId),
    }))
}

/** A row's height, which the strip's segments span. */
const ROW_HEIGHT = 52
const DOT_SIZE = 14

const styles = StyleSheet.create((theme) => ({
  list: {
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.tertiaryBackground,
    paddingVertical: theme.spacing[2],
  },
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingEnd: theme.spacing[4],
  },
  rail: {
    alignSelf: "stretch",
    width: 48,
    alignItems: "center",
  },
  segment: {
    flex: 1,
    width: 6,
  },
  dot: {
    position: "absolute",
    top: "50%",
    marginTop: -DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
    backgroundColor: theme.colors.tertiaryBackground,
  },
  terminalDot: {
    width: DOT_SIZE + 4,
    height: DOT_SIZE + 4,
    borderRadius: (DOT_SIZE + 4) / 2,
    marginTop: -(DOT_SIZE + 4) / 2,
    borderWidth: 4,
  },
  texts: {
    flex: 1,
    paddingVertical: theme.spacing[2],
    gap: 1,
  },
  name: {
    fontSize: 16,
  },
  terminalName: {
    fontWeight: "700",
  },
  note: {
    color: theme.colors.label,
  },
}))
