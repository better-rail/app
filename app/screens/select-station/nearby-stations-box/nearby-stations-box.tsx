import React, { useCallback, useEffect, useMemo } from "react"
import { View, TextStyle, ViewStyle, Platform, Pressable, ActivityIndicator } from "react-native"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRecentSearchesStore } from "../../../models"
import { trackEvent } from "../../../services/analytics"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "../../../components"
import { color, isDarkMode, spacing } from "../../../theme"
import { stationLocale, stationsObject } from "../../../data/stations"
import { NearbyStationEntry } from "./nearby-station-entry"
import { useNavigation } from "@react-navigation/core"
import { useUserLocation, useNearbyStations } from "../../../hooks"

const HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 0.5,
  borderColor: Platform.select({ ios: color.inputPlaceholderBackground, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
}

const TITLE: TextStyle = {
  fontWeight: "500",
  opacity: 0.8,
}

const FIND_BUTTON: TextStyle = {
  color: color.link,
  fontSize: 14,
}

const SCROLL_VIEW: ViewStyle = {
  minWidth: "100%",
  marginTop: spacing[3],
  paddingStart: spacing[3],
  paddingEnd: spacing[4],
  gap: spacing[3],
}

const LOADING_WRAPPER: ViewStyle = {
  marginTop: spacing[4],
  alignItems: "center",
}

const WRAPPER: ViewStyle = {
  marginTop: spacing[4],
}

type NearbyStationsBoxProps = {
  selectionType: "origin" | "destination"
}

export function NearbyStationsBox(props: NearbyStationsBoxProps) {
  const navigation = useNavigation()
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({ setOrigin: s.setOrigin, setDestination: s.setDestination })),
  )
  const saveRecentSearch = useRecentSearchesStore((s) => s.save)

  const { location, status, requestLocation, isLoading, checkPermissionStatus } = useUserLocation()
  const nearbyStations = useNearbyStations(location, 6)

  useEffect(() => {
    // Check if we already have permission and get location
    checkPermissionStatus().then((hasPermission) => {
      if (hasPermission) {
        requestLocation()
      }
    })
  }, [])

  const onStationPress = useCallback(
    (stationId: string) => {
      trackEvent("nearby_station_selected")
      const station = { id: stationId, name: stationsObject[stationId][stationLocale] }

      if (props.selectionType === "origin") {
        setOrigin(station)
      } else {
        setDestination(station)
      }

      saveRecentSearch({ id: stationId })
      navigation.goBack()
    },
    [props.selectionType, setOrigin, setDestination, saveRecentSearch, navigation],
  )

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View style={LOADING_WRAPPER}>
          <ActivityIndicator size="small" color={color.primary} />
        </View>
      )
    }

    if (status === "denied") {
      return (
        <View style={LOADING_WRAPPER}>
          <Text tx="selectStation.locationDenied" style={{ color: color.dim, textAlign: "center" }} />
        </View>
      )
    }

    if (status === "error") {
      return (
        <View style={LOADING_WRAPPER}>
          <Text tx="selectStation.locationError" style={{ color: color.dim, textAlign: "center" }} />
        </View>
      )
    }

    if (nearbyStations.length === 0) {
      return null
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={SCROLL_VIEW}
        snapToInterval={175 + spacing[3]}
      >
        {nearbyStations.map((station) => (
          <NearbyStationEntry
            key={station.id}
            name={station.name}
            image={stationsObject[station.id]?.image}
            distance={station.distance}
            onPress={() => onStationPress(station.id)}
          />
        ))}
      </ScrollView>
    )
  }, [nearbyStations, onStationPress, isLoading, status])

  // Don't render the section at all if user hasn't requested location yet
  if (status === "idle") {
    return (
      <View style={WRAPPER}>
        <View style={HEADER}>
          <Text tx="selectStation.nearbyStations" style={TITLE} />
          <Pressable onPress={requestLocation}>
            <Text tx="selectStation.findNearbyStations" style={FIND_BUTTON} />
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={WRAPPER}>
      <View style={HEADER}>
        <Text tx="selectStation.nearbyStations" style={TITLE} />
      </View>
      {content}
    </View>
  )
}
