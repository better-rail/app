import React, { useMemo } from "react"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { View, Image, TextStyle, ViewStyle, ImageStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "../../../components"
import { color, isDarkMode, spacing } from "../../../theme"
import { stationLocale, stationsObject } from "../../../data/stations"
import { StationSearchEntry } from "./station-search-entry"
import { useNavigation } from "@react-navigation/core"
import { toJS } from "mobx"

const RECENT_SEARCHES_TITLE: TextStyle = {
  fontWeight: "500",
  opacity: 0.8,
}

const RECENT_SEARCHERS_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 0.5,
  borderColor: Platform.select({ ios: color.inputPlaceholderBackground, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
}

const SCROLL_VIEW: ViewStyle = {
  minWidth: "100%",
  marginTop: spacing[3],
  paddingStart: spacing[3],
}

type RecentSearchesBoxProps = {
  selectionType: "origin" | "destination"
}

export const RecentSearchesBox = observer(function RecentSearchesBox(props: RecentSearchesBoxProps) {
  const navigation = useNavigation()
  const { routePlan, recentSearches } = useStores()

  const sortedSearches = useMemo(() => {
    return [...recentSearches.entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)
  }, [toJS(recentSearches.entries)])

  const onStationPress = (entry) => {
    const station = { id: entry.id, name: entry.id }

    if (props.selectionType === "origin") {
      routePlan.setOrigin(station)
    } else {
      routePlan.setDestination(station)
    }

    recentSearches.save({ id: station.id })
    navigation.goBack()
  }

  const content = useMemo(() => {
    if (recentSearches.entries.length === 0) return <RecentSearchesPlacerholder />

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={SCROLL_VIEW}
      >
        {sortedSearches.map((entry) => (
          <StationSearchEntry
            name={stationsObject[entry.id][stationLocale]}
            image={stationsObject[entry.id].image}
            onPress={() => onStationPress(entry)}
            onHide={() => recentSearches.remove(entry.id)}
            key={entry.id}
          />
        ))}
      </ScrollView>
    )
  }, [sortedSearches])

  return (
    <View>
      <View style={RECENT_SEARCHERS_HEADER}>
        <Text tx="selectStation.recentSearches" style={RECENT_SEARCHES_TITLE} />
      </View>

      {content}
    </View>
  )
})

const PLACEHOLDER_WRAPPER: ViewStyle = {
  marginTop: spacing[3],
  alignItems: "center",
}

const SEARCH_ICON: ImageStyle = {
  width: 57.5,
  height: 57.5,
  marginBottom: spacing[2],
  tintColor: color.dim,
  opacity: 0.8,
}

const PLACEHOLDER_INSTRUCTIONS: TextStyle = {
  color: color.dim,
  textAlign: "center",
  maxWidth: 220,
}

const RecentSearchesPlacerholder = () => (
  <View style={PLACEHOLDER_WRAPPER}>
    <Image style={SEARCH_ICON} source={require("../../../../assets/search.png")} />
    <Text style={PLACEHOLDER_INSTRUCTIONS} tx="selectStation.instructions" />
  </View>
)
