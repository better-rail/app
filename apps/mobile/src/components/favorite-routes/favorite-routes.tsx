import React from "react"
import { View, Platform, Image } from "react-native"
import type { ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useFavoritesStore } from "@/models"
import { trackEvent } from "@/services/analytics"
import { Text } from "@/components/text/text"
import { useStations } from "@/data/stations"
import { FavoriteRouteBox } from "./favorite-route-box"

export interface FavoriteRoutesProps {
  style?: ViewStyle
}

export function FavoriteRoutes(props: FavoriteRoutesProps) {
  const { style } = props
  const router = useRouter()
  const stations = useStations()
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({ setOrigin: s.setOrigin, setDestination: s.setDestination })),
  )
  const favoriteRoutesData = useFavoritesStore((s) => s.routes)

  const onFavoritePress = (originId: string, destinationId: string) => {
    trackEvent("favorite_route_selected")

    const origin = stations.find((s) => s.id === originId)
    const destination = stations.find((s) => s.id === destinationId)

    setOrigin(origin)
    setDestination(destination)

    router.back()
  }

  const favorites = (() => {
    if (favoriteRoutesData.length === 0) {
      return <EmptyState />
    }

    return favoriteRoutesData.map((route) => (
      <FavoriteRouteBox {...route} onPress={() => onFavoritePress(route.originId, route.destinationId)} key={route.id} />
    ))
  })()

  return (
    <View style={[styles.container, style]}>
      <View style={styles.favoriteRoutesHeader}>
        <Text tx="favorites.title" style={styles.favoriteRoutesTitle} />
      </View>
      <View style={styles.routesContainer}>{favorites}</View>
    </View>
  )
}

const EmptyState = () => (
  <View style={styles.emptyStateWrapper}>
    <Image source={require("../../../assets/star-fill.png")} style={styles.emptyStateImage} />
    <Text tx="favorites.empty" style={styles.emptyStateText} />
    <Text tx="favorites.emptyDescription" preset="small" style={styles.emptyStateText} />
  </View>
)

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    justifyContent: "center",
    marginTop: theme.spacing[4] + 2,
  },
  favoriteRoutesTitle: {
    fontWeight: "500",
    opacity: 0.8,
  },
  favoriteRoutesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[1],
    borderBottomWidth: 0.5,
    borderColor: Platform.select({
      ios: theme.colors.inputPlaceholderBackground,
      android: rt.colorScheme === "dark" ? "#3a3a3c" : "lightgrey",
    }),
  },
  routesContainer: {
    marginTop: theme.spacing[3],
    marginHorizontal: theme.spacing[3],
  },
  emptyStateWrapper: {
    alignItems: "center",
    marginTop: theme.spacing[2],
  },
  emptyStateText: {
    color: theme.colors.dim,
  },
  emptyStateImage: {
    width: 58,
    height: 55,
    marginBottom: theme.spacing[2],
    tintColor: theme.colors.dim,
    opacity: 0.75,
  },
}))
