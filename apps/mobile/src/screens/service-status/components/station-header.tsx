import { Image, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById, stationsObject } from "@/data/stations"
import { SHEET_HEADER_HEIGHT } from "./status-sheet"

const CLOSE_ICON = require("../../../../assets/close.png")

type StationHeaderProps = {
  stationId: string
  onClose: () => void
}

/** The station's name with its photo, and the button that closes the card; how it is doing is on the tiles below. */
export function StationHeader({ stationId, onClose }: StationHeaderProps) {
  const name = getStationById(stationId)?.name ?? stationId
  const image = stationsObject[stationId]?.image

  return (
    <View style={styles.header} testID="station-header">
      {image && <Image source={image} style={styles.photo} />}
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={2}>
          {name}
        </Text>
      </View>
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
  closeIcon: {
    width: 32,
    height: 32,
    tintColor: theme.colors.dim,
    opacity: 0.85,
  },
}))
