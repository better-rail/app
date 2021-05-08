import React, { useMemo, useState } from "react"
import { observer } from "mobx-react-lite"
import { FlatList, LayoutAnimation, View, TextInput, TextStyle, ViewStyle, Pressable, I18nManager } from "react-native"
import { Screen, Text, StationCard } from "../../components"
import { useStores } from "../../models"
import { SelectStationScreenProps } from "../../navigators/main-navigator"
import { color, spacing, typography } from "../../theme"
import { useStations } from "../../data/stations"
import { translate } from "../../i18n"

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

  textAlign: I18nManager.isRTL ? "right" : "left",
  fontFamily: typography.primary,
  borderRadius: 8,
  color: color.text,
  backgroundColor: color.background,
}

const CANCEL_LINK: TextStyle = {
  paddingStart: spacing[3],
  color: color.link,
}

const LIST_CONTENT_WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[3],
}
// #endregion

export const SelectStationScreen = observer(function SelectStationScreen({ navigation, route }: SelectStationScreenProps) {
  const { routePlan } = useStores()
  const stations = useStations()
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
          placeholder={translate("selectStation.placeholder")}
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
          autoCorrect={false}
        />
        <Pressable onPress={() => navigation.navigate("planner")}>
          <Text style={CANCEL_LINK} tx="common.cancel" />
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
