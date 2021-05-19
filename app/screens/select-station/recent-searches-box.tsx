import React from "react"
import { Image, View, TextStyle, ViewStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../../components"
import { color, spacing } from "../../theme"

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

export default function RecentSearchesBox() {
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
        <TouchableScale style={{ alignItems: "center", marginEnd: spacing[3] }}>
          <Image
            source={require("../../../assets/station-images/tlv-university.jpg")}
            style={{ width: 175, height: 125, marginBottom: spacing[1], borderRadius: 4 }}
          />
          <Text>תל אביב - אוניברסיטה</Text>
        </TouchableScale>
      </ScrollView>
    </View>
  )
}
