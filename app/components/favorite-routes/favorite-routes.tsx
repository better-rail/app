import React, { useMemo } from "react"
import { View, Platform, Image } from "react-native"
import type { TextStyle, ViewStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useFavoritesStore } from "../../models"
import { trackEvent } from "../../services/analytics"
import { color, isDarkMode, spacing } from "../../theme"
import { Text } from "../"
import { useStations } from "../../data/stations"
import { FavoriteRouteBox } from "./favorite-route-box"

// #region styles
const CONTAINER: ViewStyle = {
  justifyContent: "center",
  marginTop: spacing[4] + 2,
}

const FAVORITE_ROUTES_TITLE: TextStyle = {
  fontWeight: "500",
  opacity: 0.8,
}

const FAVORITE_ROUTES_HEADER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginHorizontal: spacing[3],
  paddingBottom: spacing[1],
  borderBottomWidth: 0.5,
  borderColor: Platform.select({ ios: color.inputPlaceholderBackground, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
}

const ROUTES_CONTAINER: ViewStyle = {
  marginTop: spacing[3],
  marginHorizontal: spacing[3],
}

// #endregion

export interface FavoriteRoutesProps {
  style?: ViewStyle
}

export function FavoriteRoutes(props: FavoriteRoutesProps) {
  const { style } = props
  const navigation = useNavigation()
  const stations = useStations()
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({ setOrigin: s.setOrigin, setDestination: s.setDestination }))
  )
  const favoriteRoutesData = useFavoritesStore((s) => s.routes)

  const onFavoritePress = (originId: string, destinationId: string) => {
    trackEvent("favorite_route_selected")

    const origin = stations.find((s) => s.id === originId)
    const destination = stations.find((s) => s.id === destinationId)

    setOrigin(origin)
    setDestination(destination)

    navigation.goBack()
  }

  const favorites = useMemo(() => {
    if (favoriteRoutesData.length === 0) {
      return <EmptyState />
    }

    return favoriteRoutesData.map((route) => (
      <FavoriteRouteBox {...route} onPress={() => onFavoritePress(route.originId, route.destinationId)} key={route.id} />
    ))
  }, [favoriteRoutesData])

  return (
    <View style={[CONTAINER, style]}>
      <View style={FAVORITE_ROUTES_HEADER}>
        <Text tx="favorites.title" style={FAVORITE_ROUTES_TITLE} />
      </View>
      <View style={ROUTES_CONTAINER}>{favorites}</View>
    </View>
  )
}

const EMPTY_STATE_WRAPPER: ViewStyle = {
  alignItems: "center",
  marginTop: spacing[2],
}

const EMPTY_STATE_TEXT: TextStyle = {
  color: color.dim,
}

const EmptyState = () => (
  <View style={EMPTY_STATE_WRAPPER}>
    <Image
      source={require("../../../assets/star-fill.png")}
      style={{ width: 58, height: 55, marginBottom: spacing[2], tintColor: color.dim, opacity: 0.75 }}
    />
    <Text tx="favorites.empty" style={EMPTY_STATE_TEXT} />
    <Text tx="favorites.emptyDescription" preset="small" style={EMPTY_STATE_TEXT} />
  </View>
)
