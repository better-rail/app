import React, { useMemo } from "react"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { View, TextStyle, ViewStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "../../../components"
import { color, spacing } from "../../../theme"
import { stationsObject } from "../../../data/stations"
import { StationSearchEntry } from "./station-search-entry"
import { useNavigation } from "@react-navigation/core"

const RECENT_SEARCHES_TITLE: TextStyle = {
  fontWeight: "500",
  opacity: 0.8,
}

const RECENT_SEARCHERS_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 1,
  borderColor: color.inputPlaceholderBackground,
}

type RecentSearchesBoxProps = {
  selectionType: "origin" | "destination"
}

export const RecentSearchesBox = observer(function RecentSearchesBox(props: RecentSearchesBoxProps) {
  const navigation = useNavigation()
  const { routePlan, recentSearches } = useStores()

  const sortedSearches = useMemo(() => {
    return [...recentSearches.entries].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [])

  const onStationPress = (entry) => {
    const station = { id: entry.id, name: entry.name }

    if (props.selectionType === "origin") {
      routePlan.setOrigin(station)
    } else {
      routePlan.setDestination(station)
    }

    navigation.goBack()
  }

  if (recentSearches.entries.length === 0) return null

  return (
    <View>
      <View style={RECENT_SEARCHERS_HEADER}>
        <Text tx="selectStation.recentSearches" style={RECENT_SEARCHES_TITLE} />
        {/* <Text tx="common.clear" style={[RECENT_SEARCHES_TITLE, { color: color.primary }]} /> */}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ marginTop: spacing[3], paddingStart: spacing[3] }}
      >
        {sortedSearches.map((entry) => (
          <StationSearchEntry
            name={entry.name}
            image={stationsObject[entry.id].image}
            onPress={() => onStationPress(entry)}
            key={entry.id}
          />
        ))}
      </ScrollView>
    </View>
  )
})
