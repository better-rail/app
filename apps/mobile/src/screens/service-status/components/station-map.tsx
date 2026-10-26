import { Image, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import MapView, { Marker } from "react-native-maps"
import { translate } from "@/i18n"
import type { StationEntrance } from "@/services/api"
import { openInMaps } from "@/utils/helpers/open-in-maps"

const EXPAND_ICON = require("../../../../assets/external-link.png")

type StationMapProps = {
  name: string
  lat: number
  lon: number
  /** The entrances with a location, marked around the station. */
  entrances: StationEntrance[]
}

/**
 * A map box on the station, as TfL Go has: the station pinned, its entrances marked, and a tap opens
 * the platform's maps app. Apple Maps on iOS; Android would need a Google Maps key first, so the box
 * is left out there.
 */
export function StationMap({ name, lat, lon, entrances }: StationMapProps) {
  if (Platform.OS !== "ios") return null
  const located = entrances.filter((e): e is StationEntrance & { location: { lat: number; lon: number } } => e.location !== null)
  const open = () => openInMaps(lat, lon, name)

  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={translate("serviceStatus.station.openInMaps") ?? undefined}
      testID="station-map"
    >
      <View style={styles.box}>
        {/* The box is one button: the map itself takes no touches. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: lat, longitude: lon, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            showsPointsOfInterests={false}
            showsCompass={false}
            toolbarEnabled={false}
          >
            {located.map((entrance) => (
              <Marker
                key={entrance.id}
                coordinate={{ latitude: entrance.location.lat, longitude: entrance.location.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View style={styles.entranceDot} />
              </Marker>
            ))}
            <Marker coordinate={{ latitude: lat, longitude: lon }} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View style={styles.stationPin}>
                <View style={styles.stationPinInner} />
              </View>
            </Marker>
          </MapView>
        </View>
        <View style={styles.expand}>
          <Image source={EXPAND_ICON} style={styles.expandIcon} />
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  box: {
    height: 180,
    borderRadius: 14,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: theme.colors.tertiaryBackground,
  },
  stationPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    borderWidth: 3,
    borderColor: theme.colors.palette.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.colors.palette.black,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  stationPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.palette.white,
  },
  entranceDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.palette.white,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  expand: {
    position: "absolute",
    bottom: theme.spacing[3],
    insetInlineEnd: theme.spacing[3],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.palette.black,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  expandIcon: {
    width: 18,
    height: 18,
    tintColor: theme.colors.palette.white,
  },
}))
