import { Image, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { color } from "@/theme"
import type { LineStatus } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { levelLabel, lineLevels, lineName } from "../service-status-text"
import { useStatusLevelColor } from "../service-status-theme"

const CHECKMARK_ICON = require("../../../../assets/checkmark.png")

/** The bar of the line's colour down the row's edge, as TfL Go draws it. */
export const BAR_WIDTH = 14

type LineStatusRowProps = {
  status: LineStatus
  /** A line with nothing wrong: one line of text, its level quietly at the end. */
  compact?: boolean
  onPress: () => void
}

/**
 * One line of the status board, after TfL Go's: the line's colour as a bar down the edge of the
 * sheet, its name, and what is wrong in words. No background of its own, so the sheet's glass shows.
 */
export function LineStatusRow({ status, compact, onPress }: LineStatusRowProps) {
  const lineColor = getRailLine(status.lineId)?.color ?? status.line.color
  const goodColor = useStatusLevelColor("goodService")

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
        {compact ? (
          <View style={styles.compactTexts}>
            <Text style={styles.compactName} numberOfLines={1}>
              {lineName(status)}
            </Text>
            {status.level === "goodService" ? (
              <Image source={CHECKMARK_ICON} style={[styles.compactCheck, { tintColor: goodColor }]} />
            ) : (
              <Text style={styles.compactLevel} numberOfLines={1}>
                {levelLabel(status.level)}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.texts}>
            <Text style={styles.name}>{lineName(status)}</Text>
            <Text style={styles.levels}>{lineLevels(status)}</Text>
          </View>
        )}
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
  compactTexts: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3] + 2,
  },
  compactName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "600",
  },
  compactCheck: {
    marginStart: "auto",
    width: 16,
    height: 16,
  },
  compactLevel: {
    marginStart: "auto",
    fontSize: 15,
    color: theme.colors.label,
  },
}))
