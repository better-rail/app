import React, { useMemo } from "react"
import { View, TextStyle, ViewStyle, Platform, ActivityIndicator, TouchableOpacity } from "react-native"
import { observer } from "mobx-react-lite"
import { useStores } from "../../../models"
import { trackEvent } from "../../../services/analytics"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "../../../components"
import { color, isDarkMode, spacing } from "../../../theme"
import { stationLocale, stationsObject } from "../../../data/stations"
import { StationSearchEntry } from "../recent-searches-box/station-search-entry"
import { useNavigation } from "@react-navigation/core"
import { useLocation } from "../../../hooks"
import { calculateDistance } from "../../../utils/distance"

const CLOSEST_STATIONS_TITLE: TextStyle = {
  fontWeight: "500",
  opacity: 0.8,
}

const CLOSEST_STATIONS_HEADER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 0.5,
  borderColor: Platform.select({ ios: color.inputPlaceholderBackground, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
}

const SCROLL_VIEW: ViewStyle = {
  minWidth: "100%",
  marginTop: spacing[3],
  paddingStart: spacing[3],
  paddingEnd: spacing[4],
  gap: spacing[3],
}

const LOADING_WRAPPER: ViewStyle = {
  marginTop: spacing[3],
  alignItems: "center",
  paddingVertical: spacing[4],
}

const REFRESH_BUTTON: ViewStyle = {
  padding: spacing[1],
  marginLeft: spacing[1],
}

type ClosestStationsBoxProps = {
  selectionType: "origin" | "destination"
}

export const ClosestStationsBox = observer(function ClosestStationsBox(props: ClosestStationsBoxProps) {
  const navigation = useNavigation()
  const { routePlan, recentSearches } = useStores()
  const { latitude, longitude, loading, error, refresh } = useLocation()

  const closestStations = useMemo(() => {
    if (!latitude || !longitude) return []

    const stationsWithDistance = Object.values(stationsObject).map((station: any) => {
      const distance = calculateDistance(latitude, longitude, station.latitude, station.longitude)
      return {
        ...station,
        distance,
      }
    })

    return stationsWithDistance.sort((a, b) => a.distance - b.distance).slice(0, 4)
  }, [latitude, longitude])

  const onStationPress = (station) => {
    trackEvent("closest_station_selected")
    const stationData = { id: station.id, name: station.id }

    if (props.selectionType === "origin") {
      routePlan.setOrigin(stationData)
    } else {
      routePlan.setDestination(stationData)
    }

    recentSearches.save({ id: station.id })
    navigation.goBack()
  }

  if (loading) {
    return (
      <View>
        <View style={CLOSEST_STATIONS_HEADER}>
          <Text tx="selectStation.nearestStations" style={CLOSEST_STATIONS_TITLE} />
        </View>
        <View style={LOADING_WRAPPER}>
          <ActivityIndicator size="small" color={color.primary} />
        </View>
      </View>
    )
  }

  if (error || !latitude || !longitude || closestStations.length === 0) {
    return null
  }

  return (
    <View>
      <View style={CLOSEST_STATIONS_HEADER}>
        <Text tx="selectStation.nearestStations" style={CLOSEST_STATIONS_TITLE} />
        <TouchableOpacity onPress={refresh} style={REFRESH_BUTTON} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 16, color: color.dim, opacity: 0.8 }}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={SCROLL_VIEW}
        snapToInterval={175 + spacing[3]}
      >
        {closestStations.map((station) => (
          <StationSearchEntry
            name={station[stationLocale]}
            image={station.image}
            onPress={() => onStationPress(station)}
            key={station.id}
          />
        ))}
      </ScrollView>
    </View>
  )
})
