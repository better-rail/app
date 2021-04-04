import React, { useState } from "react"
import { observer } from "mobx-react-lite"
import {
  FlatList,
  LayoutAnimation,
  View,
  TextInput,
  TextStyle,
  ViewStyle,
  Pressable,
} from "react-native"
import { Screen, Text, StationCard } from "../../components"
import { useNavigation } from "@react-navigation/native"
// import { useStores } from "../../models"
import { color, spacing, typography } from "../../theme"
import useStationFiltering from "./useStationFiltering"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
  padding: spacing[3],
}

const SEARCH_BAR_WRAPPER: ViewStyle = {
  flexDirection: "row-reverse",
  alignItems: "center",
}

const SEARCH_BAR: TextStyle = {
  flex: 1,
  padding: spacing[3],
  textAlign: "right",
  fontFamily: typography.primary,
  borderRadius: 8,
  backgroundColor: color.line,
}

const CANCEL_LINK: TextStyle = {
  // padding: spacing[2],
  paddingEnd: spacing[3],
  color: color.link,
}

export const SelectStationScreen = observer(function SelectStationScreen() {
  const [searchTerm, setSearchTerm] = useState("")
  const stations = useStationFiltering(searchTerm)
  const navigation = useNavigation()

  const renderItem = (item) => (
    <StationCard name={item.name} image={item.image} style={{ marginBottom: spacing[3] }} />
  )

  return (
    <Screen style={ROOT} preset="fixed" unsafe={false} statusBar="dark-content">
      <View style={SEARCH_BAR_WRAPPER}>
        <TextInput
          style={SEARCH_BAR}
          placeholder="חיפוש תחנה"
          onChangeText={(text) => {
            LayoutAnimation.configureNext({
              duration: 300,
              create: {
                type: LayoutAnimation.Types.spring,
                property: LayoutAnimation.Properties.opacity,
                springDamping: 1,
              },
              delete: {
                type: LayoutAnimation.Types.spring,
                property: LayoutAnimation.Properties.opacity,
                springDamping: 1,
              },
            })
            setSearchTerm(text)
          }}
          autoFocus={true}
        />
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={CANCEL_LINK}>ביטול</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={{ paddingTop: 12 }}
        data={stations}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
      />
    </Screen>
  )
})
