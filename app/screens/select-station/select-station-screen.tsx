import React, { useCallback, useMemo, useState } from "react"
import { View, TextStyle, ViewStyle, Pressable, Platform, I18nManager, UIManager } from "react-native"
import { Screen, Text, StationCard, FavoriteRoutes, cardHeight } from "../../components"
import { useStores } from "../../models"
import { SelectStationScreenProps } from "../../navigators/main-navigator"
import { color, spacing, isDarkMode } from "../../theme"
import { NormalizedStation } from "../../data/stations"
import { SearchInput } from "./search-input"
import { RecentSearchesBox } from "./recent-searches-box/recent-searches-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FlashList } from "@shopify/flash-list"
import { useFilteredStations } from "../../hooks"

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
  borderBottomWidth: 0.75,
  borderBottomColor: Platform.select({ ios: color.dimmer, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
}

const CANCEL_LINK: TextStyle = {
  marginStart: spacing[3],
  color: color.link,
}

// #endregion

export function SelectStationScreen({ navigation, route }: SelectStationScreenProps) {
  const { routePlan, recentSearches, favoriteRoutes } = useStores()
  const insets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState("")
  const { filteredStations } = useFilteredStations(searchTerm)

  const renderItem = useCallback(
    (station: NormalizedStation) => (
      <StationCard
        name={station.name}
        image={station.image}
        style={{ marginHorizontal: spacing[3], marginBottom: spacing[3] }}
        onPress={() => {
          if (route.params.selectionType === "origin") {
            routePlan.setOrigin(station)
          } else if (route.params.selectionType === "destination") {
            routePlan.setDestination(station)
          } else {
            throw new Error("Selection type was not provided.")
          }
          recentSearches.save({ id: station.id })
          navigation.goBack()
        }}
      />
    ),
    [route, navigation, routePlan, recentSearches],
  )

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true} statusBarBackgroundColor={isDarkMode ? "#1c1c1e" : "#f2f2f7"}>
      <View
        style={[SEARCH_BAR_WRAPPER, { paddingTop: insets.top > 20 ? insets.top : Platform.select({ ios: 27.5, android: 12.5 }) }]}
      >
        <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={favoriteRoutes.routes.length < 2} />
        <Pressable onPress={navigation.goBack}>
          <Text style={CANCEL_LINK} tx="common.cancel" />
        </Pressable>
      </View>

      <FlashList
        data={filteredStations}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={cardHeight + spacing[3]}
        ListEmptyComponent={() => (
          <View>
            <RecentSearchesBox selectionType={route.params.selectionType} />
            {recentSearches.entries.length > 1 && <FavoriteRoutes />}
          </View>
        )}
      />
    </Screen>
  )
}
