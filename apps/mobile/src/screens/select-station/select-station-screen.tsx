import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Pressable, Platform, Alert, Image, I18nManager } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Screen, Text, StationCard, FavoriteRoutes } from "@/components"
import type { StationCardBadge } from "@/components/station-card/station-card"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useRecentSearchesStore, useFavoritesStore } from "@/models"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router"
import { isDarkMode, spacing } from "@/theme"
import { NormalizedStation, useStations } from "@/data/stations"
import { SearchInput } from "./search-input"
import { RecentSearchesBox } from "./recent-searches-box/recent-searches-box"
import { FlashList, FlashListRef } from "@shopify/flash-list"
import { useFilteredStations } from "@/hooks"
import { fetchChangeStationRoute, prefetchChangeStations } from "@/screens/route-details/replace-change-station"
import { useQueryClient } from "react-query"
import * as Burnt from "burnt"
import { translate } from "@/i18n"
import { sideInsetPadding } from "@/utils/helpers/safe-area-helpers"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Host, Image as SymbolImage } from "@expo/ui/swift-ui"
import { font, frame } from "@expo/ui/swift-ui/modifiers"

const STAR_ICON = require("../../../assets/star-fill.png")
const CHECKMARK_ICON = require("../../../assets/checkmark.png")
const INFO_ICON = require("../../../assets/info.circle.png")

export type SelectionType = "origin" | "destination" | "via"

export function SelectStationScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { selectionType, stationIds, trainStartId, samePlatformIds, acrossPlatformIds } = useLocalSearchParams<{
    selectionType: SelectionType
    stationIds?: string
    trainStartId?: string
    samePlatformIds?: string
    acrossPlatformIds?: string
  }>()
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
  const [replacingStationId, setReplacingStationId] = useState<string>()
  const queryClient = useQueryClient()
  const setRouteItem = useNavigationParamsStore((s) => s.setRouteItem)
  const { filteredStations } = useFilteredStations(searchTerm)
  const listData = allowedStations ?? filteredStations
  const listRef = useRef<FlashListRef<NormalizedStation>>(null)

  useEffect(() => {
    if (selectionType !== "via" || !allowedStations) return
    prefetchChangeStations(
      queryClient,
      allowedStations.map((s) => s.id),
    )
  }, [selectionType, allowedStations, queryClient])

  // Scroll back to the top whenever the search results change.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [searchTerm])

  const pickChangeStation = async (stationId: string) => {
    if (replacingStationId) return
    setReplacingStationId(stationId)
    const replacement = await fetchChangeStationRoute(queryClient, stationId).catch(() => null)
    setReplacingStationId(undefined)
    // The picker was closed or covered by another screen mid-search
    if (!navigation.isFocused()) return
    if (!replacement) {
      Burnt.alert({ title: translate("routeDetails.noRouteViaStation"), preset: "error", message: "" })
      return
    }
    setRouteItem({ ...replacement, viaStationId: stationId })
    router.back()
  }

  const hasTrainStart = selectionType === "via" && !!allowedStations?.some((s) => s.id === trainStartId)
  const showTrainStartInfo = () =>
    Alert.alert(translate("routeDetails.trainStartsHereInfoTitle") ?? "", translate("routeDetails.trainStartsHereInfo") ?? "")

  const samePlatformSet = useMemo(() => new Set(samePlatformIds?.split(",")), [samePlatformIds])
  const acrossPlatformSet = useMemo(() => new Set(acrossPlatformIds?.split(",")), [acrossPlatformIds])
  const changeBadges = (stationId: string) => {
    if (selectionType !== "via") return undefined
    const badges: StationCardBadge[] = []
    if (stationId === trainStartId) {
      badges.push({
        label: translate("routeDetails.trainStartsHere") ?? "",
        icon: STAR_ICON,
        tone: "highlight",
      })
    }
    if (samePlatformSet.has(stationId)) {
      badges.push({ label: translate("routeDetails.samePlatform") ?? "", icon: CHECKMARK_ICON })
    } else if (acrossPlatformSet.has(stationId)) {
      badges.push({ label: translate("routeDetails.acrossPlatform") ?? "", icon: CHECKMARK_ICON })
    }
    return badges
  }

  const renderItem = (station: NormalizedStation) => (
    <StationCard
      testID={`station-item-${station.id}`}
      name={station.name}
      image={station.image}
      badges={changeBadges(station.id)}
      style={styles.stationCard}
      loading={station.id === replacingStationId}
      disabled={!!replacingStationId}
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

  const insets = useSafeAreaInsets()
  const { theme } = useUnistyles()
  const closeColor = theme.colors.text

  return (
    <Screen
      testID="select-station-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      edgeToEdge
      statusBarBackgroundColor={isDarkMode ? "#1c1c1e" : "#f2f2f7"}
    >
      {/* The bar's background spans the full width; its search field and close button stay clear of the side bars. */}
      <View style={[styles.searchBarWrapper, sideInsetPadding(insets, I18nManager.isRTL, spacing[3])]}>
        {!allowedStations && (
          <SearchInput searchTerm={searchTerm} setSearchTerm={setSearchTerm} autoFocus={favoriteRoutesData.length < 2} />
        )}
        <Pressable
          testID="cancel-station-selection"
          style={styles.closeButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={translate("common.cancel") ?? ""}
        >
          {isLiquidGlassSupported ? (
            <GlassView isInteractive style={styles.closeGlass}>
              {/* The symbol is drawn by SwiftUI; the press is the Pressable's, so the host takes no touches. */}
              <Host style={styles.closeSymbol} pointerEvents="none">
                <SymbolImage
                  systemName="xmark"
                  size={17}
                  color={closeColor}
                  modifiers={[font({ weight: "semibold" }), frame({ maxWidth: Infinity, maxHeight: Infinity })]}
                />
              </Host>
            </GlassView>
          ) : (
            <Text style={styles.cancelLink} tx="common.cancel" />
          )}
        </Pressable>
        {hasTrainStart && (
          <Pressable
            testID="train-start-info-button"
            style={styles.infoButton}
            onPress={showTrainStartInfo}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={translate("routeDetails.trainStartsHereInfoTitle") ?? ""}
          >
            <Image source={INFO_ICON} style={styles.infoIcon} />
          </Pressable>
        )}
      </View>

      <FlashList
        ref={listRef}
        data={listData}
        renderItem={({ item }) => renderItem(item)}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          sideInsetPadding(insets, I18nManager.isRTL),
          { paddingBottom: insets.bottom + spacing[0] },
        ]}
        extraData={replacingStationId}
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
  // Side and bottom insets come from the screen's own safe area (see the render): a sheet doesn't reach the bars.
  listContent: {
    paddingBottom: theme.spacing[0],
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
      android: rt.themeName === "dark" ? "#3a3a3c" : "lightgrey",
    }),
  },
  stationCard: {
    marginHorizontal: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  closeButton: {
    marginStart: theme.spacing[3],
  },
  cancelLink: {
    color: theme.colors.link,
  },
  // Sized like the header back button, with the system's own close symbol.
  closeGlass: {
    width: 45,
    height: 45,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  closeSymbol: {
    width: 45,
    height: 45,
  },
  infoButton: {
    marginStart: "auto",
  },
  infoIcon: {
    width: 24,
    height: 24,
    tintColor: theme.colors.link,
  },
}))
