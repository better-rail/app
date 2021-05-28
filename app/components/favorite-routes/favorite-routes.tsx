import React from "react"
import { View, TextStyle, ViewStyle, Platform } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import { useStores } from "../../models"
import { color, spacing, typography } from "../../theme"
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
  borderColor: Platform.select({ ios: color.inputPlaceholderBackground, android: "lightgrey" }),
}

const ROUTES_CONTAINER: ViewStyle = {
  marginHorizontal: spacing[3],
}

// #endregion

export interface FavoriteRoutesProps {
  style?: ViewStyle
}

export const FavoriteRoutes = observer(function FavoriteRoutes(props: FavoriteRoutesProps) {
  const { style } = props
  const navigation = useNavigation()
  const stations = useStations()
  const { routePlan, favoriteRoutes } = useStores()

  const onFavoritePress = (originId: string, destinationId: string) => {
    const origin = stations.find((s) => s.id === originId)
    const destination = stations.find((s) => s.id === destinationId)

    routePlan.setOrigin(origin)
    routePlan.setDestination(destination)

    navigation.goBack()
  }

  return (
    <View style={[CONTAINER, style]}>
      <View style={FAVORITE_ROUTES_HEADER}>
        <Text tx="favorites.title" style={FAVORITE_ROUTES_TITLE} />
      </View>
      <View style={ROUTES_CONTAINER}>
        {favoriteRoutes.routes.map((route) => (
          <FavoriteRouteBox {...route} onPress={() => onFavoritePress(route.originId, route.destinationId)} key={route.id} />
        ))}
      </View>
    </View>
  )
})
