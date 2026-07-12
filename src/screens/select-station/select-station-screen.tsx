import React, { useState } from "react"
import { View, Pressable, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, StationCard, FavoriteRoutes, cardHeight } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRecentSearchesStore, useFavoritesStore } from "@/models"
import { useRouter, useLocalSearchParams } from "expo-router"
import { spacing, isDarkMode } from "@/theme"
import { NormalizedStation } from "@/data/stations"
import { SearchInput } from "./search-input"
import { RecentSearchesBox } from "./recent-searches-box/recent-searches-box"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FlashList } from "@shopify/flash-list"
import { useFilteredStations } from "@/hooks"

export function SelectStationScreen() {
  const router = useRouter()
  const { selectionType } = useLocalSearchParams<{ selectionType: "origin" | "destination" }>()
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({ setOrigin: s.setOrigin, setDestination: s.setDestination })),
  )
  const saveRecentSearch = useRecentSearchesStore((s) => s.save)
  const recentSearchEntries = useRecentSearchesStore((s) => s.entries)
  const favoriteRoutesData = useFavoritesStore((s) => s.routes)
  const insets = useSafeAreaInsets()
  const [searchTerm, setSearchTerm] = useState("")
  const { filteredStations } = useFilteredStations(searchTerm)

  const renderItem = (station: NormalizedStation) => (
    <StationCard
      testID={`station-item-${station.id}`}
      name={station.name}
      image={station.image}
      style={styles.stationCard}
      onPress={() => {
        if (selectionType === "origin") {
          setOrigin(station)
        } else if (selectionType === "destination") {
          setDestination(station)
        } else {
          throw new Error("Selection type was not provided.")
        }
        saveRecentSearch({ id: station.id })
        router.back()
      }}
    />
  )

  return (
    <Screen style={styles.root} preset="fixed" unsafe={true} statusBarBackgroundColor={isDarkMode ? "#1c1c1e" : "#f2f2f7"}>
      <View
        style={[
          styles.searchBarWrapper,
          { paddingTop: insets.top > 20 ? insets.top : Platform.select({ ios: 27.5, android: 12.5 }) },
        ]}
      >
        <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={favoriteRoutesData.length < 2} />
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelLink} tx="common.cancel" />
        </Pressable>
      </View>

      <FlashList
        data={filteredStations}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        estimatedItemSize={cardHeight + spacing[3]}
        ListEmptyComponent={() => (
          <View>
            <RecentSearchesBox selectionType={selectionType} />
            {recentSearchEntries.length > 1 && <FavoriteRoutes />}
          </View>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.secondaryBackground,
    flex: 1,
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0.75,
    borderBottomColor: Platform.select({ ios: theme.colors.dimmer, android: isDarkMode ? "#3a3a3c" : "lightgrey" }),
  },
  stationCard: {
    marginHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  cancelLink: {
    marginStart: theme.spacing[3],
    color: theme.colors.link,
  },
}))
