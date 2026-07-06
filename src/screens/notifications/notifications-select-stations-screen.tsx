import { useState } from "react"

import { Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { StationListItem } from "./station-list-item"
import { Screen, Text } from "@/components"
import { useRouter } from "expo-router"
import { SearchInput } from "@/screens/select-station/search-input"
import { translate } from "@/i18n"
import { useShallow } from "zustand/react/shallow"
import { useSettingsStore } from "@/models"
import HapticFeedback from "react-native-haptic-feedback"
import { useFilteredStations, useIsDarkMode } from "@/hooks"
import { useStations } from "@/data/stations"

import { FlashList } from "@shopify/flash-list"
export function NotificationsSelectStationsScreen() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")

  const { stationsNotifications, removeStationNotification, addStationNotification } = useSettingsStore(
    useShallow((s) => ({
      stationsNotifications: s.stationsNotifications,
      removeStationNotification: s.removeStationNotification,
      addStationNotification: s.addStationNotification,
    })),
  )

  const stations = useStations()
  const { filteredStations } = useFilteredStations(searchTerm)

  const displayedStations = searchTerm === "" ? stations : filteredStations

  const isDarkMode = useIsDarkMode()

  const onSelected = (stationId: string) => {
    HapticFeedback.trigger("impactLight")

    if (stationsNotifications.includes(stationId)) {
      removeStationNotification(stationId)
      return
    }

    addStationNotification(stationId)
  }

  return (
    <Screen style={{ flex: 1 }} unsafe={true} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"} translucent>
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={false} />
          <Pressable onPress={router.back}>
            <Text style={styles.doneText}>
              {translate("common.done")} ({stationsNotifications.length})
            </Text>
          </Pressable>
        </View>

        <FlashList
          data={displayedStations}
          renderItem={({ item, extraData: selectedStations }) => {
            return (
              <StationListItem
                title={item.name}
                image={item.image}
                selected={selectedStations.includes(item.id)}
                onSelect={() => onSelected(item.id)}
                style={styles.listItem}
              />
            )
          }}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          extraData={stationsNotifications}
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
