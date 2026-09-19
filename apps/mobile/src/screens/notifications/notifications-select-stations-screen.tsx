import { useState } from "react"
import { Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import { FlashList } from "@shopify/flash-list"
import { Screen, Text } from "@/components"
import { SearchInput } from "@/screens/select-station/search-input"
import { translate } from "@/i18n"
import { useSettingsStore } from "@/models"
import { useStations } from "@/data/stations"
import { useFilteredStations, useIsDarkMode } from "@/hooks"
import { trackEvent } from "@/services/analytics"
import { StationListItem } from "./station-list-item"

/** Every station, searchable, each toggling whether it is followed (on every line; its card narrows that). */
export function NotificationsSelectStationsScreen() {
  const router = useRouter()
  const isDarkMode = useIsDarkMode()
  const [searchTerm, setSearchTerm] = useState("")
  const { alerts, setStationAlert, removeStationAlert } = useSettingsStore(
    useShallow((s) => ({
      alerts: s.stationAlerts,
      setStationAlert: s.setStationAlert,
      removeStationAlert: s.removeStationAlert,
    })),
  )
  const stations = useStations()
  const { filteredStations } = useFilteredStations(searchTerm)
  const displayedStations = searchTerm === "" ? stations : filteredStations
  const followed = alerts.map((a) => a.stationId)

  const onSelected = (stationId: string) => {
    HapticFeedback.trigger("impactLight")
    if (followed.includes(stationId)) {
      trackEvent("station_alert_disabled", { stationId, source: "select_stations" })
      removeStationAlert(stationId)
    } else {
      trackEvent("station_alert_enabled", { stationId, source: "select_stations" })
      setStationAlert(stationId)
    }
  }

  return (
    <Screen style={{ flex: 1 }} unsafe={true} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"} translucent>
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={false} />
          <Pressable onPress={router.back} testID="station-alerts-done">
            <Text style={styles.doneText}>
              {translate("common.done")} ({followed.length})
            </Text>
          </Pressable>
        </View>

        <FlashList
          data={displayedStations}
          renderItem={({ item, extraData: selected }) => (
            <StationListItem
              title={item.name}
              image={item.image}
              selected={(selected as string[]).includes(item.id)}
              onSelect={() => onSelected(item.id)}
              style={styles.listItem}
              testID={`station-alert-option-${item.id}`}
            />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          extraData={followed}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing[3],
    paddingTop: Platform.OS === "android" ? rt.insets.top : 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
    gap: theme.spacing[3],
  },
  doneText: {
    color: theme.colors.primary,
  },
  listItem: {
    marginBottom: theme.spacing[3],
  },
  listContent: {
    paddingTop: theme.spacing[2],
    paddingBottom: theme.spacing[5],
  },
}))
