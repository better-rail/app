import { View, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { RAIL_MAP_PALETTE, paleColor } from "@/components/rail-map"
import { RAIL_LINES } from "@/data/rail-lines"
import { type TxKeyPath, translate } from "@/i18n"
import { MINOR_DELAY_MINUTES, SEVERE_DELAY_MINUTES } from "@/services/api"

/** The line whose colour the samples borrow. */
const SAMPLE = RAIL_LINES.find((l) => l.id === "3") ?? RAIL_LINES[0]
/** Two lines of different colours, for the sample of the lines themselves and of a shared station. */
const LINE_SAMPLES = RAIL_LINES.filter((l) => l.id === "2" || l.id === "3")

/** What the markings on the network map mean. */
export function MapLegend() {
  const scheme = useColorScheme()
  const palette = RAIL_MAP_PALETTE[scheme === "dark" ? "dark" : "light"]
  const ring = { borderColor: palette.marker, backgroundColor: palette.markerFill }

  const rows: { key: TxKeyPath; sample: React.ReactNode }[] = [
    {
      key: "serviceStatus.legend.lines",
      sample: (
        <View style={styles.lines}>
          {LINE_SAMPLES.map((line) => (
            <View key={line.id} style={[styles.bar, { backgroundColor: line.color }]} />
          ))}
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.stop",
      sample: (
        <View style={styles.layered}>
          <View style={[styles.bar, styles.layeredBar, { backgroundColor: SAMPLE.color }]} />
          <View style={[styles.tick, { backgroundColor: palette.marker }]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.interchange",
      sample: (
        <View style={styles.layered}>
          <View style={styles.lines}>
            {LINE_SAMPLES.map((line) => (
              <View key={line.id} style={[styles.bar, { backgroundColor: line.color }]} />
            ))}
          </View>
          <View style={[styles.capsule, ring]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.irregularStop",
      sample: (
        <View style={styles.layered}>
          <View style={[styles.bar, styles.layeredBar, { backgroundColor: SAMPLE.color }]} />
          <View style={[styles.disc, { borderColor: palette.dimInk, backgroundColor: palette.markerFill }]} />
        </View>
      ),
    },
    {
      key: "serviceStatus.legend.terminal",
      sample: (
        <View style={styles.layered}>
          <View style={[styles.bar, styles.layeredBar, styles.barEnd, { backgroundColor: SAMPLE.color }]} />
          <View style={[styles.disc, ring, styles.terminal]}>
            <View style={[styles.terminalDot, { backgroundColor: palette.marker }]} />
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
            <View style={[styles.exclamationBar, { backgroundColor: palette.badgeInk }]} />
            <View style={[styles.exclamationDot, { backgroundColor: palette.badgeInk }]} />
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
    </View>
  )
}

const SAMPLE_WIDTH = 76
const SAMPLE_HEIGHT = 32
const BAR_HEIGHT = 8
const CAPSULE = 20
const RING = 3
/** The badge's diameter, in the capsule's proportion to the map's (radius 0.92 to a capsule 1.55 wide), and its glyph unit. */
const BADGE = Math.round((CAPSULE * 2 * 0.92) / 1.55)
const BADGE_UNIT = BADGE / 2 / 1.4

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
    height: SAMPLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 15,
  },
  lines: {
    gap: 6,
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
  },
  barEnd: {
    width: SAMPLE_WIDTH / 2 + BAR_HEIGHT,
    alignSelf: "flex-start",
  },
  half: {
    width: SAMPLE_WIDTH / 2,
    borderRadius: 0,
  },
  layered: {
    width: SAMPLE_WIDTH,
    height: SAMPLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  layeredBar: {
    position: "absolute",
    top: (SAMPLE_HEIGHT - BAR_HEIGHT) / 2,
  },
  tick: {
    position: "absolute",
    width: 3,
    height: 10,
    top: SAMPLE_HEIGHT / 2 - BAR_HEIGHT / 2 - 10,
  },
  capsule: {
    position: "absolute",
    width: CAPSULE,
    height: CAPSULE + BAR_HEIGHT + 6,
    borderRadius: CAPSULE / 2,
    borderWidth: RING,
  },
  disc: {
    position: "absolute",
    width: CAPSULE,
    height: CAPSULE,
    borderRadius: CAPSULE / 2,
    borderWidth: RING,
  },
  terminal: {
    left: SAMPLE_WIDTH / 2 - CAPSULE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  // The badge as the map draws it: a disc a little wider than the capsule, with a shaped "!" (see exclamationPath).
  disruption: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    borderWidth: 1.5,
    alignItems: "center",
  },
  exclamationBar: {
    position: "absolute",
    top: BADGE / 2 - 0.95 * BADGE_UNIT,
    width: 0.48 * BADGE_UNIT,
    height: 1.15 * BADGE_UNIT,
    borderRadius: 0.24 * BADGE_UNIT,
  },
  exclamationDot: {
    position: "absolute",
    top: BADGE / 2 + 0.35 * BADGE_UNIT,
    width: 0.54 * BADGE_UNIT,
    height: 0.54 * BADGE_UNIT,
    borderRadius: 0.27 * BADGE_UNIT,
  },
  credit: {
    marginTop: theme.spacing[2],
  },
}))
