import React, { useRef } from "react"
import { View, Image, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRecentSearchesStore } from "@/models"
import { trackEvent } from "@/services/analytics"
import { ScrollView } from "react-native-gesture-handler"
import { Text } from "@/components"
import { isDarkMode, spacing } from "@/theme"
import { stationLocale, stationsObject } from "@/data/stations"
import { StationSearchEntry } from "./station-search-entry"
import { useRouter } from "expo-router"

type RecentSearchesBoxProps = {
  selectionType: "origin" | "destination"
}

export function RecentSearchesBox(props: RecentSearchesBoxProps) {
  const router = useRouter()
  const { setOrigin, setDestination } = useRoutePlanStore(
    useShallow((s) => ({ setOrigin: s.setOrigin, setDestination: s.setDestination })),
  )
  const { entries, save, remove } = useRecentSearchesStore(
    useShallow((s) => ({ entries: s.entries, save: s.save, remove: s.remove })),
  )

  // Rank by recency once per mount — the new order only shows the next time the picker opens.
  // Picking an entry bumps its `updatedAt` and pops the screen in the same commit, and Fabric on
  // Android can't mount a re-sort inside a subtree that same commit is deleting: it throws
  // "addViewAt: cannot insert view […] View already has a parent" and blanks the app.
  const initialRankRef = useRef<Map<string, number> | null>(null)
  const initialRank = (initialRankRef.current ??= new Map(
    [...entries].sort((a, b) => b.updatedAt - a.updatedAt).map((entry, index) => [entry.id, index]),
  ))

  const rankOf = (id: string) => initialRank.get(id) ?? Number.MAX_SAFE_INTEGER
  const sortedSearches = [...entries].sort((a, b) => rankOf(a.id) - rankOf(b.id)).slice(0, 6)

  const onStationPress = (entry) => {
    trackEvent("recent_station_selected")
    const station = { id: entry.id, name: entry.id }

    if (props.selectionType === "origin") {
      setOrigin(station)
    } else {
      setDestination(station)
    }

    save({ id: station.id })
    router.back()
  }

  const content = (() => {
    if (entries.length === 0) return <RecentSearchesPlacerholder />

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollView}
        snapToInterval={175 + spacing[3]}
      >
        {sortedSearches.map((entry) => {
          // if a station is removed from stations list, it might still be in recent searches
          if (!stationsObject[entry.id]) return null

          return (
            <StationSearchEntry
              name={stationsObject[entry.id][stationLocale]}
              image={stationsObject[entry.id].image}
              onPress={() => onStationPress(entry)}
              onHide={() => remove(entry.id)}
              key={entry.id}
            />
          )
        })}
      </ScrollView>
    )
  })()

  return (
    <View>
      <View style={styles.recentSearchersHeader}>
        <Text tx="selectStation.recentSearches" style={styles.recentSearchesTitle} />
      </View>

      {content}
    </View>
  )
}

const RecentSearchesPlacerholder = () => (
  <View style={styles.placeholderWrapper}>
    <Image style={styles.searchIcon} source={require("../../../../assets/search.png")} />
    <Text style={styles.placeholderInstructions} tx="selectStation.instructions" />
  </View>
)

const styles = StyleSheet.create((theme) => ({
  recentSearchesTitle: {
    fontWeight: "500",
    opacity: 0.8,
  },
  recentSearchersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: theme.spacing[3],
    paddingBottom: theme.spacing[1],
    borderBottomWidth: 0.5,
    borderColor: Platform.select({
      ios: theme.colors.inputPlaceholderBackground,
      android: isDarkMode ? "#3a3a3c" : "lightgrey",
    }),
  },
  scrollView: {
    minWidth: "100%",
    marginTop: theme.spacing[3],
    paddingStart: theme.spacing[3],
    paddingEnd: theme.spacing[4],
    gap: theme.spacing[3],
  },
  placeholderWrapper: {
    marginTop: theme.spacing[3],
    alignItems: "center",
  },
  searchIcon: {
    width: 57.5,
    height: 57.5,
    marginBottom: theme.spacing[2],
    tintColor: theme.colors.dim,
    opacity: 0.8,
  },
  placeholderInstructions: {
    color: theme.colors.dim,
    textAlign: "center",
    maxWidth: 220,
  },
}))
