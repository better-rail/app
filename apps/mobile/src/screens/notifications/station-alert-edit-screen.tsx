import { Image, ScrollView, TouchableOpacity, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Stack, useLocalSearchParams } from "expo-router"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { getStationById } from "@/data/stations"
import { openStationAlert } from "@/utils/helpers/open-station-alert"
import { StationAlertsCard } from "@/screens/service-status/components/station-alerts-card"

/**
 * One station's notifications, from the settings: the switch, which of its lines and which days
 * count, and a way on to its card on the status map.
 */
export function StationAlertEditScreen() {
  const { stationId } = useLocalSearchParams<{ stationId: string }>()
  const station = stationId ? getStationById(stationId) : undefined
  if (!station) return null

  const openCard = () => {
    HapticFeedback.trigger("impactLight")
    openStationAlert(station.id)
  }

  return (
    <>
      <Stack.Screen options={{ title: station.name }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} testID="station-alert-edit">
        <View style={styles.station}>
          {station.image && (
            <Image source={station.image} style={styles.photo} accessible={false} accessibilityIgnoresInvertColors />
          )}
          <Text style={styles.name} accessibilityRole="header">
            {station.name}
          </Text>
        </View>
        <StationAlertsCard stationId={station.id} source="settings" />
        <TouchableOpacity onPress={openCard} accessibilityRole="link" style={styles.link} testID="station-alert-open-card">
          <Text style={styles.linkText} tx="stationAlerts.openStationCard" />
        </TouchableOpacity>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[4],
    paddingBottom: theme.spacing[6],
    gap: theme.spacing[4],
  },
  station: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
  },
  photo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.inputPlaceholderBackground,
  },
  name: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
  },
  link: {
    paddingVertical: theme.spacing[2],
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.link,
  },
}))
