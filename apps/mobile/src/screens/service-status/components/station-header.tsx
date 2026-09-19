import { Image, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById, stationsObject } from "@/data/stations"
import { stationAlertFor, useSettingsStore } from "@/models"
import { SHEET_HEADER_HEIGHT } from "./status-sheet"

const CLOSE_ICON = require("../../../../assets/close.png")
const BELL_ICON = require("../../../../assets/bell.png")

type StationHeaderProps = {
  stationId: string
  onClose: () => void
  /** The bell was tapped: the card shows its notifications section, where following is switched on and tuned. */
  onShowAlerts: () => void
}

/**
 * The station's name with its photo, the bell that opens its notifications (lit while the station is
 * followed) and the button that closes the card; how the station is doing is on the tiles below.
 */
export function StationHeader({ stationId, onClose, onShowAlerts }: StationHeaderProps) {
  const name = getStationById(stationId)?.name ?? stationId
  const image = stationsObject[stationId]?.image
  const followed = useSettingsStore((s) => stationAlertFor(s.stationAlerts, stationId) !== undefined)

  return (
    <View style={styles.header} testID="station-header">
      {image && <Image source={image} style={styles.photo} />}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onShowAlerts}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={translate("stationAlerts.cardTitle") ?? undefined}
        hitSlop={8}
        testID={followed ? "station-bell-on" : "station-bell-off"}
      >
        <Image source={BELL_ICON} style={[styles.bellIcon, followed ? styles.bellOn : styles.bellOff]} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={translate("common.close") ?? undefined}
        hitSlop={8}
        testID="station-close"
      >
        <Image source={CLOSE_ICON} style={styles.closeIcon} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  header: {
    minHeight: SHEET_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    paddingBottom: theme.spacing[3],
    backgroundColor: theme.colors.background,
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  bellIcon: {
    width: 24,
    height: 26,
    marginEnd: theme.spacing[1],
  },
  bellOn: {
    tintColor: theme.colors.primary,
  },
  bellOff: {
    tintColor: theme.colors.dim,
    opacity: 0.85,
  },
  closeIcon: {
    width: 32,
    height: 32,
    tintColor: theme.colors.dim,
    opacity: 0.85,
  },
}))
