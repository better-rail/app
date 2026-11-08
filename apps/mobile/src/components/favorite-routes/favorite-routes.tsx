import React, { useState } from "react"
import { View, Platform, Image, Pressable } from "react-native"
import type { ViewStyle } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import Sortable from "react-native-sortables"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useFavoritesStore, type FavoriteRoute } from "@/models"
import { trackEvent } from "@/services/analytics"
import { Text } from "@/components/text/text"
import { useStations } from "@/data/stations"
import { buttonFontStyle, labelFontStyle, subheadingFontStyle } from "@/theme/theme-fonts"
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
  const reorder = useFavoritesStore((s) => s.reorder)
  const { theme } = useUnistyles()
  const [isEditing, setIsEditing] = useState(false)
  const canReorder = favoriteRoutesData.length > 1
  const editing = isEditing && canReorder

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

    return (
      <Sortable.Grid
        data={favoriteRoutesData}
        keyExtractor={(route) => route.id}
        renderItem={({ item: route }: { item: FavoriteRoute }) => (
          <FavoriteRouteBox
            {...route}
            isEditing={editing}
            onReorder={canReorder ? () => setIsEditing(true) : undefined}
            onPress={() => onFavoritePress(route.originId, route.destinationId)}
          />
        )}
        columns={1}
        rowGap={theme.spacing[4]}
        sortEnabled={editing}
        customHandle
        // Single column, so lock drag to the vertical axis. The library positions items
        // with physical x coordinates and has no RTL support, so horizontal drag is mirrored in Hebrew.
        overDrag="vertical"
        hapticsEnabled
        activeItemScale={1.03}
        inactiveItemOpacity={1}
        onDragEnd={({ data, fromIndex, toIndex }) => {
          if (fromIndex === toIndex) return
          trackEvent("favorite_routes_reordered")
          reorder(data.map((route) => route.id))
        }}
      />
    )
  })()

  return (
    <View style={[styles.container, style]}>
      <View style={styles.favoriteRoutesHeader}>
        <Text tx="favorites.title" style={styles.favoriteRoutesTitle} />
        {editing && (
          <Pressable testID="favorites-done-button" onPress={() => setIsEditing(false)} hitSlop={12} accessibilityRole="button">
            <Text tx="common.done" style={styles.doneButton} />
          </Pressable>
        )}
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
    ...subheadingFontStyle(theme, 16, "500"),
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
      android: rt.themeName === "dark" ? "#3a3a3c" : "lightgrey",
    }),
  },
  doneButton: {
    ...buttonFontStyle(theme, 16, "600"),
    color: theme.colors.link,
  },
  routesContainer: {
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[4],
    marginHorizontal: theme.spacing[3],
  },
  emptyStateWrapper: {
    alignItems: "center",
    marginTop: theme.spacing[2],
  },
  emptyStateText: {
    fontFamily: theme.skin.labelFont?.family ?? theme.typography.primary,
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
