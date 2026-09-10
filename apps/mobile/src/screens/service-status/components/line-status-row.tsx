import { Image, TouchableHighlight, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { color } from "@/theme"
import { CHEVRON_ICON } from "@/screens/settings/components/settings-box"
import type { LineStatus } from "@/services/api"
import { getRailLine } from "@/data/rail-lines"
import { LineBadge } from "./line-badge"
import { levelLabel, lineName } from "../service-status-text"
import { useStatusLevelColor } from "../service-status-theme"

const chevronIcon = require("../../../../assets/chevron.png")

type LineStatusRowProps = {
  status: LineStatus
  first?: boolean
  last?: boolean
  onPress: () => void
}

/** One line of the status board: colour bar, badge, name and its current level. */
export function LineStatusRow({ status, first, last, onPress }: LineStatusRowProps) {
  const line = getRailLine(status.lineId) ?? { ...status.line, badgeStyle: "solid" as const, textColor: undefined }
  const levelColor = useStatusLevelColor(status.level)

  return (
    <TouchableHighlight
      underlayColor={color.inputPlaceholderBackground}
      onPress={onPress}
      style={[styles.row, first && styles.first, last && styles.last]}
      testID={`service-status-line-${status.lineId}`}
      accessibilityRole="button"
      accessibilityLabel={`${lineName(status)}, ${levelLabel(status.level)}`}
    >
      <View style={styles.inner}>
        <View style={[styles.bar, { backgroundColor: line.color }]} />
        <LineBadge line={line} />
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {lineName(status)}
          </Text>
          <Text style={[styles.level, { color: levelColor }]}>{levelLabel(status.level)}</Text>
        </View>
        <Image source={chevronIcon} style={CHEVRON_ICON} />
      </View>
    </TouchableHighlight>
  )
}

const styles = StyleSheet.create((theme) => ({
  row: {
    backgroundColor: theme.colors.tertiaryBackground,
    overflow: "hidden",
  },
  first: { borderTopStartRadius: 14, borderTopEndRadius: 14 },
  last: { borderBottomStartRadius: 14, borderBottomEndRadius: 14 },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    paddingEnd: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    gap: theme.spacing[3],
  },
  bar: {
    alignSelf: "stretch",
    width: 6,
    marginVertical: -theme.spacing[3],
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
  },
  level: {
    fontSize: 15,
    fontWeight: "500",
  },
}))
