import { TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Circle, Path, Svg } from "react-native-svg"
import { Text } from "@/components"
import { useIsDarkMode } from "@/hooks"
import { color } from "@/theme"
import type { RailLine } from "@/data/rail-lines"
import { type DayType, SERVICE_PATTERNS } from "@/data/rail-service-patterns"
import { compareServiceStatusLevels, type LineStatus, type ServiceStatusLevel } from "@/services/api"
import { levelLabel, stationName } from "../service-status-text"
import { STATUS_LEVEL_INKS } from "../service-status-theme"

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
 * where it calls, with the level under the name of each station a disruption names. Tap one for
 * its card.
 */
export function LineStations({ line, status, dayType, onSelectStation }: LineStationsProps) {
  const isDark = useIsDarkMode()
  const stops = lineStops(line, status, dayType)

  return (
    <View style={styles.list} testID="line-stations">
      {stops.map((stop, index) => {
        const first = index === 0
        const last = index === stops.length - 1
        const levelInk = stop.level ? STATUS_LEVEL_INKS[stop.level][isDark ? "dark" : "light"] : undefined
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
                {stop.level ? (
                  // The map's badge for a station a disruption names: a "!" on a disc.
                  <View style={[styles.badge, isDark ? styles.badgeDark : styles.badgeLight]}>
                    <Svg width={BADGE_SIZE} height={BADGE_SIZE} viewBox="0 0 24 24" accessible={false}>
                      <Path d="M12 5.5v8" stroke={isDark ? "#0E1220" : "#FFFFFF"} strokeWidth={3.4} strokeLinecap="round" />
                      <Circle cx={12} cy={18.3} r={1.9} fill={isDark ? "#0E1220" : "#FFFFFF"} />
                    </Svg>
                  </View>
                ) : (
                  <View style={[styles.dot, (first || last) && styles.terminalDot, { borderColor: line.color }]} />
                )}
              </View>
              <View style={styles.texts}>
                <Text style={[styles.name, (first || last) && styles.terminalName]} numberOfLines={1}>
                  {stationName(stop.stationId)}
                </Text>
                {stop.level && (
                  <Text style={[styles.note, { color: levelInk }]} preset="small">
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
const BADGE_SIZE = 20

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
  // The same disc the map puts on an affected station, in the map's colours.
  badge: {
    position: "absolute",
    top: "50%",
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    marginTop: -BADGE_SIZE / 2,
    borderRadius: BADGE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeLight: {
    backgroundColor: "#1D1D1F",
  },
  badgeDark: {
    backgroundColor: "#F2F2F7",
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
