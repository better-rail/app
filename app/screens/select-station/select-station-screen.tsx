import React, { useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, View, TextStyle, ViewStyle, Pressable, Platform, I18nManager, Appearance } from "react-native"
import { Screen, Text, StationCard } from "../../components"
import { useStores } from "../../models"
import { SelectStationScreenProps } from "../../navigators/main-navigator"
import { color, spacing } from "../../theme"
import { useStations } from "../../data/stations"
import { SearchInput } from "./search-input"
import RecentSearchesBox from "./recent-searches-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"

const isDarkMode = Appearance.getColorScheme() === "dark"

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.secondaryBackground,
  flex: 1,
}

const SEARCH_BAR_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing[3],
  paddingBottom: spacing[3],
  marginBottom: spacing[3],
  backgroundColor: color.background,
  borderBottomWidth: 1,
  borderBottomColor: color.dimmer,
}

const CANCEL_LINK: TextStyle = {
  paddingStart: Platform.select({ ios: spacing[3], android: undefined }),
  // Android is quirky when switching RTL/LTR modes, so this is a workaround
  paddingRight: Platform.select({ ios: undefined, android: I18nManager.isRTL ? spacing[3] : undefined }),
  paddingLeft: Platform.select({ ios: undefined, android: I18nManager.isRTL ? undefined : spacing[3] }),

  color: color.link,
}

// #endregion

export const SelectStationScreen = observer(function SelectStationScreen({ navigation, route }: SelectStationScreenProps) {
  const { routePlan } = useStores()
  const stations = useStations()
  const insets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredStations = useMemo(() => {
    if (searchTerm === "") return []
    return stations.filter(
      (item) =>
        item.name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1 ||
        item.hebrew.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1, // Enable hebrew search
    )
  }, [searchTerm])

  const renderItem = (station) => (
    <StationCard
      name={station.name}
      image={station.image}
      style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
      onPress={() => {
        if (route.params.selectionType === "origin") {
          routePlan.setOrigin(station)
        } else if (route.params.selectionType === "destination") {
          routePlan.setDestination(station)
        } else {
          throw new Error("Selection type was not provided.")
        }
        navigation.navigate("planner")
      }}
    />
  )

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}>
      <View style={[SEARCH_BAR_WRAPPER, { paddingTop: insets.top }]}>
        <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <Pressable onPress={() => navigation.navigate("planner")}>
          <Text style={CANCEL_LINK} tx="common.cancel" />
        </Pressable>
      </View>

      <FlatList
        data={filteredStations}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={() => <RecentSearchesBox />}
      />
    </Screen>
  )
})
