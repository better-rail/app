import { observer } from "mobx-react-lite"
import { useState } from "react"

import { Pressable, ScrollView, View } from "react-native"
import { StationListItem } from "./station-list-item"
import { color, spacing } from "../../theme"
import { Text } from "../../components"
import { useNavigation } from "@react-navigation/native"
import { SearchInput } from "../select-station/search-input"
import { translate } from "../../i18n"
import { useStores } from "../../models"
import HapticFeedback from "react-native-haptic-feedback"
import { useFilteredStations } from "../../hooks"
import { useStations } from "../../data/stations"

import messaging from "@react-native-firebase/messaging"

export const NotificationsSelectStationsScreen = observer(function NotificationsSelectStationsScreen() {
  const navigation = useNavigation()
  const [searchTerm, setSearchTerm] = useState("")

  const { settings } = useStores()
  const { stationsNotifications } = settings

  const stations = useStations()
  const { filteredStations } = useFilteredStations(searchTerm)

  const displayedStations = searchTerm === "" ? stations : filteredStations

  const onSelected = (stationId: string) => {
    HapticFeedback.trigger("impactLight")

    if (stationsNotifications.includes(stationId)) {
      messaging().subscribeToTopic(`station-${stationId}`)
      settings.removeStationNotification(stationId)
      return
    }

    settings.addStationNotification(stationId)
  }

  return (
    <View style={{ paddingHorizontal: spacing[3] }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: spacing[3],
          marginBottom: spacing[2],
          gap: spacing[3],
        }}
      >
        <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={true} />
        <Pressable onPress={navigation.goBack}>
          <Text style={{ color: color.primary }}>
            {translate("common.done")} ({stationsNotifications.length})
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ rowGap: 12 }} showsVerticalScrollIndicator={false}>
        {displayedStations.map((station) => (
          <StationListItem
            key={station.id}
            title={station.name}
            image={station.image}
            selected={stationsNotifications.includes(station.id)}
            onSelect={() => onSelected(station.id)}
          />
        ))}
      </ScrollView>
    </View>
  )
})
