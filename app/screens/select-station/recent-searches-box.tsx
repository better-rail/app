import React, { useMemo } from "react"
import { observer } from "mobx-react-lite"
import { useStores } from "../../models"
import { Image, View, TextStyle, ViewStyle, ImageSourcePropType, ImageStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../components"
import { color, spacing } from "../../theme"
import { stationsObject } from "../../data/stations"

const RECENT_SEARCHES_TITLE: TextStyle = {
  fontWeight: "500",
}

const RECENT_SEARCHERS_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 1,
  borderColor: color.inputPlaceholderBackground,
}

export const RecentSearchesBox = observer(function RecentSearchesBox() {
  const { recentSearches } = useStores()

  const sortedSearches = useMemo(() => {
    return [...recentSearches.entries].sort((a, b) => b.updatedAt - a.updatedAt)
  }, [])

  return (
    <View>
      <View style={RECENT_SEARCHERS_HEADER}>
        <Text tx="selectStation.recentSearches" style={RECENT_SEARCHES_TITLE} />
        {/* <Text tx="common.clear" style={[RECENT_SEARCHES_TITLE, { color: color.primary }]} /> */}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ marginTop: spacing[3], paddingStart: spacing[3] }}
      >
        {sortedSearches.map((entry) => (
          <StationSearchEntry name={entry.name} image={stationsObject[entry.id].image} onPress={() => null} key={entry.id} />
        ))}
      </ScrollView>
    </View>
  )
})

const SEARCH_ENTRY_WRAPPER: ViewStyle = { alignItems: "center", marginEnd: spacing[3] }
const SEARCH_ENTRY_IMAGE: ImageStyle = { width: 175, height: 125, marginBottom: spacing[1], borderRadius: 6 }

type StationSearchEntryProps = {
  image: ImageSourcePropType
  name: string
  onPress: () => void
}

const StationSearchEntry = (props: StationSearchEntryProps) => (
  <TouchableScale onPress={props.onPress} activeScale={0.96} friction={8} style={SEARCH_ENTRY_WRAPPER}>
    <Image source={props.image} style={SEARCH_ENTRY_IMAGE} />
    <Text>{props.name}</Text>
  </TouchableScale>
)
