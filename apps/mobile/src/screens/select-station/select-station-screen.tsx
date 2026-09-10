import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Pressable, Platform, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen, Text, StationCard, FavoriteRoutes } from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRecentSearchesStore, useFavoritesStore } from "@/models"
import { useRouter, useLocalSearchParams } from "expo-router"
import { spacing, isDarkMode } from "@/theme"
import { NormalizedStation, useStations } from "@/data/stations"
import { SearchInput } from "./search-input"
import { RecentSearchesBox } from "./recent-searches-box/recent-searches-box"
import { FlashList, FlashListRef } from "@shopify/flash-list"
import { useFilteredStations } from "@/hooks"
import { replaceChangeStation } from "@/screens/route-details/replace-change-station"
import * as Burnt from "burnt"
import { translate } from "@/i18n"

export type SelectionType = "origin" | "destination" | "via"

export function SelectStationScreen() {
  const router = useRouter()
  const { selectionType, stationIds } = useLocalSearchParams<{ selectionType: SelectionType; stationIds?: string }>()
  const allStations = useStations()
  const allowedStations = useMemo(() => {
    if (!stationIds) return undefined
    const ids = stationIds.split(",")
    return ids.map((id) => allStations.find((s) => s.id === id)).filter((s): s is NormalizedStation => !!s)
  }, [stationIds, allStations])
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({
      setOrigin: s.setOrigin,
      setDestination: s.setDestination,
    })),
  )
  const saveRecentSearch = useRecentSearchesStore((s) => s.save)
  const recentSearchEntries = useRecentSearchesStore((s) => s.entries)
  const favoriteRoutesData = useFavoritesStore((s) => s.routes)
  const [searchTerm, setSearchTerm] = useState("")
  const [isReplacing, setIsReplacing] = useState(false)
  const { filteredStations } = useFilteredStations(searchTerm)
  const listData = allowedStations ?? filteredStations
  const listRef = useRef<FlashListRef<NormalizedStation>>(null)

  // Scroll back to the top whenever the search results change.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [searchTerm])

  const pickChangeStation = async (stationId: string) => {
    if (isReplacing) return
    setIsReplacing(true)
    const replaced = await replaceChangeStation(stationId).catch(() => false)
    setIsReplacing(false)
    if (!replaced) {
      Burnt.alert({ title: translate("routeDetails.noRouteViaStation"), preset: "error", message: "" })
      return
    }
    router.back()
  }

  const renderItem = (station: NormalizedStation) => (
    <StationCard
      testID={`station-item-${station.id}`}
      name={station.name}
      image={station.image}
      style={styles.stationCard}
      onPress={() => {
        if (selectionType === "origin") {
          saveRecentSearch({ id: station.id })
          setOrigin(station)
        } else if (selectionType === "destination") {
          saveRecentSearch({ id: station.id })
          setDestination(station)
        } else if (selectionType === "via") {
          pickChangeStation(station.id)
          return
        } else {
          throw new Error("Selection type was not provided.")
        }
        router.back()
      }}
    />
  )

  return (
    <Screen
      testID="select-station-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBarBackgroundColor={isDarkMode ? "#1c1c1e" : "#f2f2f7"}
    >
      <View style={styles.searchBarWrapper}>
        {!allowedStations && (
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={favoriteRoutesData.length < 2} />
        )}
        <Pressable testID="cancel-station-selection" onPress={() => router.back()}>
          <Text style={styles.cancelLink} tx="common.cancel" />
        </Pressable>
      </View>

      <FlashList
        ref={listRef}
        data={listData}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListFooterComponent={isReplacing ? <ActivityIndicator style={{ marginTop: spacing[3] }} /> : null}
        // Disabled: otherwise FlashList may scroll the list out of view when results change between keystrokes.
        maintainVisibleContentPosition={{ disabled: true }}
        ListEmptyComponent={() =>
          allowedStations ? null : (
            <View>
              <RecentSearchesBox selectionType={selectionType} />
              {recentSearchEntries.length > 1 && <FavoriteRoutes />}
            </View>
          )
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    backgroundColor: theme.colors.secondaryBackground,
    flex: 1,
  },
  listContent: {
    paddingBottom: rt.insets.bottom + theme.spacing[0],
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: rt.insets.top > 20 ? rt.insets.top : Platform.select({ ios: 27.5, android: 12.5 }),
    paddingHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[3],
    marginBottom: theme.spacing[3],
    backgroundColor: theme.colors.background,
    borderBottomWidth: 0.75,
    borderBottomColor: Platform.select({
      ios: theme.colors.dimmer,
      android: isDarkMode ? "#3a3a3c" : "lightgrey",
    }),
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
