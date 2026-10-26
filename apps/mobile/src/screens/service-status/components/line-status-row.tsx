import { TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { color } from "@/theme"
import type { LineStatus } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { levelLabel, lineLevels, lineName } from "../service-status-text"
import { useStatusLevelInk } from "../service-status-theme"

/** The line's colour, as a slim pill before its name. */
const PILL_WIDTH = 5

type LineStatusRowProps = {
  status: LineStatus
  /** A line whose state isn't known: just its name, on one line. */
  compact?: boolean
  /** The last row of its card draws no separator under it. */
  last?: boolean
  onPress: () => void
}

/**
 * One line of the status board, as a row of a grouped card: the line's colour as a pill, its name,
 * and its level in words in the level's colour. A line whose state isn't known gets nothing, since
 * the summary above already says the live data is missing.
 */
export function LineStatusRow({ status, compact, last, onPress }: LineStatusRowProps) {
  const lineColor = getRailLine(status.lineId)?.color ?? status.line.color
  const levelInk = useStatusLevelInk(status.level)

  return (
    <TouchableHighlight
      underlayColor={color.inputPlaceholderBackground}
      onPress={onPress}
      testID={`service-status-line-${status.lineId}`}
      accessibilityRole="button"
      accessibilityLabel={`${lineName(status)}, ${levelLabel(status.level)}`}
    >
      <View style={styles.row}>
        <View style={[styles.pill, compact ? styles.pillCompact : styles.pillTall, { backgroundColor: lineColor }]} />
        <View style={[styles.body, !last && styles.separator]}>
          {compact ? (
            <Text style={styles.compactName} numberOfLines={1}>
              {lineName(status)}
            </Text>
          ) : (
            <View style={styles.texts}>
              <Text style={styles.name}>{lineName(status)}</Text>
              <Text style={[styles.levels, { color: levelInk }]}>{lineLevels(status)}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingStart: theme.spacing[4],
    gap: 12,
  },
  pill: {
    width: PILL_WIDTH,
    borderRadius: PILL_WIDTH / 2,
  },
  pillCompact: {
    height: 22,
  },
  pillTall: {
    alignSelf: "stretch",
    marginVertical: theme.spacing[3],
  },
  body: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    minHeight: 50,
    paddingEnd: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  levels: {
    fontSize: 15,
    fontWeight: "500",
  },
  compactName: {
    flexShrink: 1,
    fontSize: 17,
  },
}))
