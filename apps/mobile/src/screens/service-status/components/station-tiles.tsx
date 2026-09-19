import { Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { color } from "@/theme"
import type { OpenState } from "../station-hours"
import type { StationStatus, StationStatusKind } from "../station-status"
import { openStateDetail } from "../service-status-text"
import { tinted, useStationKindColor } from "../service-status-theme"

/** The tiles, each of which scrolls the card to its section when tapped. */
export type StationTile = "status" | "open"

type StationTilesProps = {
  status: StationStatus
  /** Undefined while the station's next trains are loading and they decide it. */
  kind: StationStatusKind | undefined
  /** Undefined while the station's page is loading. */
  openState: OpenState | undefined
  /** Israel's day of the week right now (1 = Sunday), so a closed station says "opens 05:00" today and "opens Sun 05:00" otherwise. */
  today: number
  /** Names a day (1 = Sunday) in the user's language. */
  dayName: (day: number) => string
  onPress: (tile: StationTile) => void
}

/**
 * The pair of tiles under "Go now", after TfL Go's Status / Quiet / Zone: how the station is doing and
 * whether it is open right now (Israel Railways has no crowding or fare zones to show). Each tile takes
 * the card to its section.
 */
export function StationTiles({ status, kind, openState, today, dayName, onPress }: StationTilesProps) {
  const kindColor = useStationKindColor(kind)
  return (
    <View style={styles.row} testID="station-tiles">
      <Tile
        label={translate("serviceStatus.station.status") ?? ""}
        tint={kind ? tinted(kindColor) : undefined}
        onPress={() => onPress("status")}
        testID="station-tile-status"
      >
        {kind ? (
          <Text
            style={[styles.kind, { color: kindColor }]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            testID={`station-kind-${kind}`}
          >
            {translate(`serviceStatus.station.kinds.${kind}`)}
          </Text>
        ) : (
          <Text style={styles.big} maxFontSizeMultiplier={1.2}>
            …
          </Text>
        )}
      </Tile>
      <Tile label={translate("serviceStatus.station.openNow") ?? ""} onPress={() => onPress("open")} testID="station-tile-open">
        <OpenTile openState={openState} today={today} dayName={dayName} />
      </Tile>
    </View>
  )
}

type TileProps = { label: string; tint?: string; onPress: () => void; testID?: string; children: React.ReactNode }

function Tile({ label, tint, onPress, testID, children }: TileProps) {
  return (
    <View style={styles.tile}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.box, tint ? { backgroundColor: tint } : null, pressed && styles.boxPressed]}
        testID={testID}
      >
        {children}
      </Pressable>
    </View>
  )
}

/** Open or closed, and until or from when. */
function OpenTile({
  openState,
  today,
  dayName,
}: {
  openState: OpenState | undefined
  today: number
  dayName: (day: number) => string
}) {
  if (!openState || openState.state === "unknown") {
    return (
      <Text style={styles.big} maxFontSizeMultiplier={1.2}>
        {openState ? "–" : "…"}
      </Text>
    )
  }
  const open = openState.state === "open"
  const detail = openStateDetail(openState, today, dayName)
  return (
    <View style={styles.open} testID={`station-open-${openState.state}`}>
      <View style={styles.openRow}>
        <View style={[styles.openDot, { backgroundColor: open ? color.success : color.dim }]} />
        <Text style={styles.openText} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {translate(open ? "serviceStatus.station.open" : "serviceStatus.station.closedNow")}
        </Text>
      </View>
      {detail && (
        <Text style={styles.openDetail} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {detail}
        </Text>
      )}
    </View>
  )
}

const TILE_HEIGHT = 64

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: "row",
    gap: theme.spacing[3],
  },
  tile: {
    flex: 1,
    gap: theme.spacing[1],
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: theme.colors.label,
    textAlign: "center",
  },
  box: {
    height: TILE_HEIGHT,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: theme.colors.tertiaryBackground,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing[2],
  },
  boxPressed: {
    opacity: 0.7,
  },
  big: {
    fontSize: 26,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  kind: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  open: {
    alignItems: "center",
    gap: 2,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
  },
  openDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  openText: {
    fontSize: 17,
    fontWeight: "700",
  },
  openDetail: {
    fontSize: 12,
    color: theme.colors.label,
  },
}))
