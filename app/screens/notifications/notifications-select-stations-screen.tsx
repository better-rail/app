import { observer } from "mobx-react-lite"
import { useState } from "react"

import { Pressable, View } from "react-native"
import { StationListItem } from "./station-list-item"
import { color, fontScale, spacing } from "../../theme"
import { Text } from "../../components"
import { useNavigation } from "@react-navigation/native"
import { SearchInput } from "../select-station/search-input"
import { translate } from "../../i18n"
import { useStores } from "../../models"
import * as Haptics from "expo-haptics"
import { useFilteredStations } from "../../hooks"
import { useStations } from "../../data/stations"

import { FlashList } from "@shopify/flash-list"
import { toJS } from "mobx"

export const NotificationsSelectStationsScreen = observer(function NotificationsSelectStationsScreen() {
  const navigation = useNavigation()
  const [searchTerm, setSearchTerm] = useState("")

  const { settings } = useStores()
  const { stationsNotifications } = settings

  const stations = useStations()
  const { filteredStations } = useFilteredStations(searchTerm)

  const displayedStations = searchTerm === "" ? stations : filteredStations

  const onSelected = (stationId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (stationsNotifications.includes(stationId)) {
      settings.removeStationNotification(stationId)
      return
    }

    settings.addStationNotification(stationId)
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: spacing[3] }}>
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
        estimatedItemSize={76 * fontScale}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: spacing[2], paddingBottom: spacing[5] }}
        extraData={toJS(stationsNotifications)}
      />
    </View>
  )
})
