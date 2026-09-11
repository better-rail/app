import { TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { color } from "@/theme"
import type { LineStatus } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { levelLabel, lineLevels, lineName } from "../service-status-text"

/** The bar of the line's colour down the row's edge, as TfL Go draws it. */
export const BAR_WIDTH = 14

type LineStatusRowProps = {
  status: LineStatus
  onPress: () => void
}

/**
 * One line of the status board, after TfL Go's: the line's colour as a bar down the edge of the
 * sheet, its name, and what is wrong in words. No background of its own, so the sheet's glass shows.
 */
export function LineStatusRow({ status, onPress }: LineStatusRowProps) {
  const lineColor = getRailLine(status.lineId)?.color ?? status.line.color

  return (
    <TouchableHighlight
      underlayColor={color.inputPlaceholderBackground}
      onPress={onPress}
      style={styles.row}
      testID={`service-status-line-${status.lineId}`}
      accessibilityRole="button"
      accessibilityLabel={`${lineName(status)}, ${levelLabel(status.level)}`}
    >
      <View style={styles.inner}>
        <View style={[styles.bar, { backgroundColor: lineColor }]} />
        <View style={styles.texts}>
          <Text style={styles.name}>{lineName(status)}</Text>
          <Text style={styles.levels}>{lineLevels(status)}</Text>
        </View>
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.separator,
  },
  inner: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  bar: {
    width: BAR_WIDTH,
  },
  texts: {
    flex: 1,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    gap: theme.spacing[1],
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
  },
  levels: {
    fontSize: 16,
  },
}))
