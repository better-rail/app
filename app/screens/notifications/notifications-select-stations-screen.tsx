import { observer } from "mobx-react-lite"
import { useState } from "react"

import { Platform, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { StationListItem } from "./station-list-item"
import { color, spacing } from "../../theme"
import { Screen, Text } from "../../components"
import { useNavigation } from "@react-navigation/native"
import { SearchInput } from "../select-station/search-input"
import { translate } from "../../i18n"
import { useStores } from "../../models"
import HapticFeedback from "react-native-haptic-feedback"
import { useFilteredStations, useIsDarkMode } from "../../hooks"
import { useStations } from "../../data/stations"

import { FlashList } from "@shopify/flash-list"
import { toJS } from "mobx"

export const NotificationsSelectStationsScreen = observer(function NotificationsSelectStationsScreen() {
  const navigation = useNavigation()
  const [searchTerm, setSearchTerm] = useState("")
  const insets = useSafeAreaInsets()

  const { settings } = useStores()
  const { stationsNotifications } = settings

  const stations = useStations()
  const { filteredStations } = useFilteredStations(searchTerm)

  const displayedStations = searchTerm === "" ? stations : filteredStations

  const isDarkMode = useIsDarkMode()

  const onSelected = (stationId: string) => {
    HapticFeedback.trigger("impactLight")

    if (stationsNotifications.includes(stationId)) {
      settings.removeStationNotification(stationId)
      return
    }

    settings.addStationNotification(stationId)
  }

  return (
    <Screen
      style={{ flex: 1 }}
      unsafe={true}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <View style={{ flex: 1, paddingHorizontal: spacing[3], paddingTop: Platform.OS === "android" ? insets.top : 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: spacing[3],
            marginBottom: spacing[2],
            gap: spacing[3],
          }}
        >
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={false} />
          <Pressable onPress={navigation.goBack}>
            <Text style={{ color: color.primary }}>
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
                style={{ marginBottom: spacing[3] }}
              />
            )
          }}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: spacing[2], paddingBottom: spacing[5] }}
          extraData={toJS(stationsNotifications)}
        />
      </View>
    </Screen>
  )
})
