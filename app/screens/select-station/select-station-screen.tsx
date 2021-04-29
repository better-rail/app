import React, { useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, LayoutAnimation, View, TextInput, TextStyle, ViewStyle, Pressable } from "react-native"
import { Screen, Text, StationCard } from "../../components"
import { useStores } from "../../models"
import { SelectStationScreenProps } from "../../navigators/main-navigator"
import { color, spacing, typography } from "../../theme"
import stations from "../../data/stations"

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.secondaryBackground,
  flex: 1,
}

const SEARCH_BAR_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing[3],
  marginBottom: spacing[3],
  marginTop: spacing[2],
}

const SEARCH_BAR: TextStyle = {
  flex: 1,
  padding: spacing[3],

  textAlign: "right",
  fontFamily: typography.primary,
  borderRadius: 8,
  color: color.text,
  backgroundColor: color.background,
}

const CANCEL_LINK: TextStyle = {
  // RTL not works correctly on Android
  paddingStart: Platform.select({ ios: spacing[3], android: 0 }),
  paddingEnd: Platform.select({ ios: 0, android: spacing[3] }),
  color: color.link,
}

const LIST_CONTENT_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3],
}
// #endregion

export const SelectStationScreen = observer(function SelectStationScreen({ navigation, route }: SelectStationScreenProps) {
  const { routePlan } = useStores()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredStations = useMemo(() => {
    if (searchTerm === "") return []
    return stations.filter((item) => item.name.toLowerCase().indexOf(searchTerm.toLowerCase()) > -1)
  }, [searchTerm])

  const renderItem = (station) => (
    <StationCard
      name={station.name}
      image={station.image}
      style={{ marginBottom: spacing[3] }}
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
    <Screen style={ROOT} preset="fixed" unsafe={false}>
      <View style={SEARCH_BAR_WRAPPER}>
        <TextInput
          style={SEARCH_BAR}
          placeholder="חיפוש תחנה"
          placeholderTextColor={color.dim}
          onChangeText={(text) => {
            LayoutAnimation.configureNext({
              duration: 400,
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
        <Pressable onPress={() => navigation.navigate("planner")}>
          <Text style={CANCEL_LINK}>ביטול</Text>
        </Pressable>
      </View>

      <FlatList
        contentContainerStyle={LIST_CONTENT_WRAPPER}
        data={filteredStations}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
      />
    </Screen>
  )
})
