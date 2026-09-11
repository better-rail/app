import { View, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { RAIL_MAP_PALETTE, paleColor } from "@/components/rail-map"
import { RAIL_LINES } from "@/data/rail-lines"
import { type TxKeyPath, translate } from "@/i18n"
import { MINOR_DELAY_MINUTES, SEVERE_DELAY_MINUTES } from "@/services/api"
import { LineBadge } from "./line-badge"

/** The line whose colour the samples borrow. */
const SAMPLE = RAIL_LINES.find((l) => l.id === "3") ?? RAIL_LINES[0]

/** What the markings on the network map mean, after the original map's legend. */
export function MapLegend() {
  const scheme = useColorScheme()
  const palette = RAIL_MAP_PALETTE[scheme === "dark" ? "dark" : "light"]
  const dot = { backgroundColor: palette.dot }

  const rows: { key: TxKeyPath; sample: React.ReactNode }[] = [
    {
      key: "serviceStatus.legend.lines",
      sample: (
        <View style={styles.badges}>
          {RAIL_LINES.filter((l) => l.id === "2" || l.id === "3X").map((line) => (
            <LineBadge key={line.id} line={line} size={24} />
          ))}
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.stop",
      sample: (
        <View style={[styles.bar, { backgroundColor: SAMPLE.color }]}>
          <View style={[styles.dot, dot]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.irregularStop",
      sample: (
        <View style={[styles.bar, { backgroundColor: SAMPLE.color }]}>
          <View style={[styles.ring, { borderColor: palette.dot }]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.terminal",
      sample: (
        <View style={styles.barRow}>
          <View style={[styles.bar, styles.barEnd, { backgroundColor: SAMPLE.color }]}>
            <View style={[styles.dot, dot, styles.terminalDot]}>
              <View style={[styles.terminalRing, { borderColor: palette.background }]} />
            </View>
          </View>
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.suspended",
      sample: (
        <View style={styles.barRow}>
          <View style={[styles.bar, styles.half, { backgroundColor: SAMPLE.color }]} />
          <View style={[styles.bar, styles.half, { backgroundColor: paleColor(SAMPLE.color, palette.background) }]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.disruption",
      sample: (
        <View style={styles.layered}>
          <View style={[styles.bar, styles.layeredBar, { backgroundColor: SAMPLE.color }]} />
          <View style={[styles.disruption, { backgroundColor: palette.badge, borderColor: palette.background }]}>
            <Text style={[styles.disruptionText, { color: palette.badgeInk }]} maxFontSizeMultiplier={1}>
              !
            </Text>
          </View>
        </View>
      ),
    },
  ]

  return (
    <View style={styles.wrapper} testID="map-legend">
      <Text style={styles.title} tx="serviceStatus.legend.title" />
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.sample}>{row.sample}</View>
          <Text style={styles.label} tx={row.key} />
        </View>
      ))}
      <Text style={styles.credit} preset="secondary">
        {translate("serviceStatus.thresholds", { minor: MINOR_DELAY_MINUTES, severe: SEVERE_DELAY_MINUTES })}
      </Text>
      <Text tx="serviceStatus.mapCredit" preset="secondary" />
    </View>
  )
}

const SAMPLE_WIDTH = 76
const BAR_HEIGHT = 11
const DOT = 12

const styles = StyleSheet.create((theme, rt) => ({
  wrapper: {
    paddingTop: theme.spacing[5],
    paddingBottom: rt.insets.bottom + theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[3],
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: theme.spacing[1],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
  },
  sample: {
    width: SAMPLE_WIDTH,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
  badges: {
    flexDirection: "row",
    gap: theme.spacing[1],
  },
  barRow: {
    flexDirection: "row",
    width: SAMPLE_WIDTH,
    alignItems: "center",
  },
  bar: {
    width: SAMPLE_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  barEnd: {
    width: SAMPLE_WIDTH * 0.7,
    alignItems: "flex-end",
    paddingEnd: 1,
  },
  half: {
    width: SAMPLE_WIDTH / 2,
    borderRadius: 0,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  ring: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2.2,
  },
  terminalDot: {
    alignItems: "center",
    justifyContent: "center",
  },
  terminalRing: {
    width: DOT - 3,
    height: DOT - 3,
    borderRadius: (DOT - 3) / 2,
    borderWidth: 1.5,
  },
  layered: {
    width: SAMPLE_WIDTH,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  layeredBar: {
    position: "absolute",
    top: (28 - BAR_HEIGHT) / 2,
  },
  disruption: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  disruptionText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  credit: {
    marginTop: theme.spacing[2],
  },
}))
