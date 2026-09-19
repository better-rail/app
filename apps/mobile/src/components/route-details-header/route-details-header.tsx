import { useRef, useEffect } from "react"
import { I18nManager, Image, ImageBackground, Platform, View, Animated as RNAnimated, Pressable } from "react-native"
import type { ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter, useNavigation, Stack } from "expo-router"
import { trackEvent } from "@/services/analytics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import LinearGradient from "react-native-linear-gradient"
import { color, spacing } from "@/theme"
import { StarIcon } from "@/components/star-icon/star-icon"
import { IS_E2E } from "@/config/e2e"
import { FilterIcon } from "@/components/filter-icon/filter-icon"
import { FaresIcon } from "@/components/fares-icon/fares-icon"
import { MenuIcon } from "@/components/menu-icon/menu-icon"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "@/data/stations"
import { translate } from "@/i18n"
import { useShallow } from "zustand/react/shallow"
import { useFavoritesStore, useRoutePlanStore, useSettingsStore, activeFilterCount } from "@/models"
import * as Burnt from "burnt"
import type { RouteItem } from "@/services/api"
import { ContextMenu } from "@/components/context-menu/context-menu"
import { addRouteToCalendar as addRouteToCalendarHelper, CalendarEventConfig } from "@/utils/helpers/calendar-helpers"
import { createContextMenuActions } from "@/components/route-card/route-context-menu-actions"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { HeaderBackButton } from "@/components/header-back-button"
import { sideInsetPadding } from "@/utils/helpers/safe-area-helpers"
import { RouteStationNameButton } from "./route-station-name-button"

const arrowIcon = require("../../../assets/arrow-left.png")
const ARROW_SIZE = 34
// The gap between the station buttons, which the arrow overlaps.
const BUTTON_GAP = spacing[5]
const ellipsisIcon = require("../../../assets/ellipsis.regular.png")

/** A plain Image, not `MenuIcon`: a Touchable child would swallow the menu's tap. */
function HeaderMenuIcon({ active }: { active?: boolean }) {
  return (
    <Image
      source={ellipsisIcon}
      accessible
      accessibilityRole="button"
      accessibilityLabel={translate("routes.routeActions")}
      style={[styles.headerMenuIcon, active && styles.headerMenuIconActive]}
    />
  )
}

export interface RouteDetailsHeaderProps {
  originId: string
  destinationId: string
  routeItem?: RouteItem
  /**
   * The screen name we're displaying the header inside
   */
  screenName?: "routeList" | "routeDetails" | "activeRide"
  style?: ViewStyle
  eventConfig?: CalendarEventConfig
  showEntireRoute?: boolean
  setShowEntireRoute?: React.Dispatch<React.SetStateAction<boolean>>
  /**
   * The route list's split view: the width of its first column (from the start inset) and the gap before the second
   * (the fold, when partially folded). The station buttons then line up with the columns below them.
   */
  splitColumns?: { firstWidth: number; gap: number } | null
}

export function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { routeItem, originId, destinationId, screenName, style, showEntireRoute, setShowEntireRoute, splitColumns } = props
  const {
    routes: favoriteRoutesData,
    add: addFavorite,
    remove: removeFavorite,
  } = useFavoritesStore(useShallow((s) => ({ routes: s.routes, add: s.add, remove: s.remove })))
  const {
    origin: routePlanOrigin,
    destination: routePlanDestination,
    switchDirection,
  } = useRoutePlanStore(useShallow((s) => ({ origin: s.origin, destination: s.destination, switchDirection: s.switchDirection })))
  const filterCount = useSettingsStore(activeFilterCount)
  const isFilterActive = filterCount > 0
  const router = useRouter()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const routeEditDisabled = screenName !== "routeList"

  const stationCardScale = useRef(new RNAnimated.Value(1)).current

  // A station can outlive its entry in `stations.ts` — it may still sit in a favorite route, a
  // recent search or a deep link. Reading it blindly throws and takes the whole screen down.
  const originStation = stationsObject[originId]
  const destinationStation = stationsObject[destinationId]
  const originName = originStation?.[stationLocale]
  const destinationName = destinationStation?.[stationLocale]
  const routeId = `${originId}${destinationId}`
  const isFavorite = favoriteRoutesData.some((fav) => fav.id === routeId)
  // iOS 26+ uses the native navigation bar, which the system can lay out vertically (e.g. on iPhone Duo).
  const useNativeToolbar = screenName !== "activeRide" && Platform.OS === "ios" && isLiquidGlassSupported

  // Lined up with the split view's columns: the origin button over the list and the destination over the details.
  // They meet on the boundary between the columns (the fold, when partially folded) with the same gap as on phones,
  // so the arrow centred there overlaps both ends.
  const rowPadding = spacing[3]
  const splitLayout = splitColumns
    ? (() => {
        const boundary = splitColumns.firstWidth - rowPadding + splitColumns.gap / 2
        return {
          origin: { flex: 0, width: boundary - BUTTON_GAP / 2 },
          destination: { marginStart: BUTTON_GAP },
          arrow: { start: rowPadding + boundary - ARROW_SIZE / 2 },
          row: { gap: 0 },
        }
      })()
    : null

  const scaleStationCards = () => {
    RNAnimated.sequence([
      RNAnimated.timing(stationCardScale, {
        toValue: 0.94,
        duration: 175,
        useNativeDriver: true,
      }),
      RNAnimated.timing(stationCardScale, {
        toValue: 1,
        duration: 175,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const swapDirection = () => {
    scaleStationCards()
    HapticFeedback.trigger("impactMedium")
    setTimeout(() => {
      switchDirection()
    }, 50)
  }

  const changeOriginStation = () => {
    router.push({ pathname: "/select-station", params: { selectionType: "origin" } })
  }

  const changeDestinationStation = () => {
    router.push({ pathname: "/select-station", params: { selectionType: "destination" } })
  }

  const addToCalendar = async () => {
    if (!routeItem) return

    try {
      await addRouteToCalendarHelper(routeItem)
    } catch (error) {
      // Error handling is already done in the helper
      console.error("Failed to add to calendar:", error)
    }
  }

  const openFaresSheet = () => {
    HapticFeedback.trigger("impactMedium")
    router.push({ pathname: "/fares", params: { originId, destinationId } })
  }

  const handleFavoritePress = () => {
    const favorite = { id: routeId, originId, destinationId }
    if (!isFavorite) {
      if (!IS_E2E) Burnt.alert({ title: translate("favorites.added"), duration: 1.5 })
      HapticFeedback.trigger("impactMedium")
      addFavorite(favorite)
      trackEvent("favorite_route_added")
    } else {
      HapticFeedback.trigger("impactLight")
      removeFavorite(favorite.id)
      trackEvent("favorite_route_removed")
    }
  }

  const openFilterSheet = () => {
    HapticFeedback.trigger("impactMedium")
    router.push("/filter")
  }

  const routeMenuActions = (() => {
    if (!routeItem) return []
    return createContextMenuActions(routeItem, originId, destinationId)
  })()

  const shareAction = routeMenuActions.find((action) => action.systemIcon === "square.and.arrow.up")

  const handleShare = async () => {
    if (shareAction) {
      await shareAction.onPress()
    }
  }

  // Only the route list reads its stations from params — the other screens use the params store.
  useEffect(() => {
    if (routeEditDisabled) return

    const nextOriginId = routePlanOrigin?.id
    const nextDestinationId = routePlanDestination?.id
    if (!nextOriginId || !nextDestinationId) return
    if (nextOriginId === originId && nextDestinationId === destinationId) return

    navigation.setParams({ originId: nextOriginId, destinationId: nextDestinationId } as never)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routePlanOrigin?.id, routePlanDestination?.id, originId, destinationId, routeEditDisabled])

  const renderHeaderRight = () => {
    if (screenName === "routeDetails") {
      const actions = [
        {
          title: translate("routes.share"),
          systemIcon: "square.and.arrow.up",
          onPress: handleShare,
        },
        {
          title: translate("routeDetails.addToCalendar"),
          systemIcon: "calendar",
          onPress: addToCalendar,
        },
        {
          title: translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations"),
          systemIcon: showEntireRoute ? "rectangle.compress.vertical" : "rectangle.expand.vertical",
          onPress: () => setShowEntireRoute((prev) => !prev),
        },
        {
          title: translate("fares.title"),
          systemIcon: "shekelsign.circle",
          onPress: openFaresSheet,
        },
      ]

      if (isLiquidGlassSupported) {
        return (
          <ContextMenu mode="tap" actions={actions}>
            <GlassView isInteractive colorScheme="dark" style={{ padding: 12, borderRadius: 50 }}>
              <MenuIcon />
            </GlassView>
          </ContextMenu>
        )
      }

      return (
        <ContextMenu mode="tap" actions={actions}>
          <HeaderMenuIcon />
        </ContextMenu>
      )
    }

    if (isLiquidGlassSupported) {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
          <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
          <FaresIcon onPress={openFaresSheet} />
          <FilterIcon active={isFilterActive} count={filterCount} onPress={openFilterSheet} />
        </View>
      )
    }

    // Mirrors the iOS 26 toolbar: fares and filter sit behind one ellipsis menu.
    const routeListActions = [
      {
        title: translate("fares.title"),
        systemIcon: "shekelsign.circle",
        onPress: openFaresSheet,
      },
      {
        title: isFilterActive ? `${translate("routes.filter")} (${filterCount})` : translate("routes.filter"),
        systemIcon: "line.3.horizontal.decrease",
        selected: isFilterActive,
        onPress: openFilterSheet,
      },
    ]

    return (
      <>
        <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
        <ContextMenu mode="tap" style={{ marginLeft: spacing[3] }} actions={routeListActions}>
          <HeaderMenuIcon active={isFilterActive} />
        </ContextMenu>
      </>
    )
  }

  return (
    <>
      {useNativeToolbar && screenName === "routeDetails" && (
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: "",
            unstable_headerRightItems: () => [
              {
                type: "menu",
                label: translate("routes.routeActions") ?? "",
                sharesBackground: false,
                icon: { type: "sfSymbol", name: "ellipsis" },
                accessibilityLabel: translate("routes.routeActions") ?? undefined,
                menu: {
                  items: [
                    {
                      type: "action",
                      label: translate("routes.share") ?? "",
                      icon: { type: "sfSymbol", name: "square.and.arrow.up" },
                      onPress: handleShare,
                    },
                    {
                      type: "action",
                      label: translate("routeDetails.addToCalendar") ?? "",
                      icon: { type: "sfSymbol", name: "calendar" },
                      onPress: addToCalendar,
                    },
                    {
                      type: "action",
                      label: translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations") ?? "",
                      icon: {
                        type: "sfSymbol",
                        name: showEntireRoute ? "rectangle.compress.vertical" : "rectangle.expand.vertical",
                      },
                      onPress: () => setShowEntireRoute?.((prev) => !prev),
                    },
                    {
                      type: "action",
                      label: translate("fares.title") ?? "",
                      icon: { type: "sfSymbol", name: "shekelsign.circle" },
                      onPress: openFaresSheet,
                    },
                  ],
                },
              },
            ],
          }}
        />
      )}

      {useNativeToolbar && screenName === "routeList" && (
        <Stack.Screen
          options={{
            headerShown: true,
            headerTransparent: true,
            headerTitle: "",
            unstable_headerRightItems: () => [
              {
                type: "button",
                // Titles don't show beside the symbol, but the system uses them in overflow menus.
                label: translate("favorites.title") ?? "",
                sharesBackground: false,
                tintColor: isFavorite ? color.palette.orangeMuted : undefined,
                icon: { type: "sfSymbol", name: "star" },
                accessibilityLabel: translate("favorites.title") ?? undefined,
                onPress: handleFavoritePress,
              },
              // A trip selected in the split view's details pane (wide layouts only).
              ...(routeItem
                ? [
                    {
                      type: "button" as const,
                      label: translate("routes.share") ?? "",
                      sharesBackground: false,
                      icon: { type: "sfSymbol" as const, name: "square.and.arrow.up" as const },
                      onPress: handleShare,
                    },
                  ]
                : []),
              {
                type: "menu",
                label: translate("routes.routeActions") ?? "",
                sharesBackground: false,
                // The default red reads as an alert, so use the filter icon's orange instead.
                badge: isFilterActive
                  ? {
                      value: String(filterCount),
                      style: {
                        backgroundColor: color.palette.orange,
                        color: color.palette.black,
                        fontSize: 12,
                        fontWeight: "600",
                      },
                    }
                  : undefined,
                icon: { type: "sfSymbol", name: "ellipsis" },
                accessibilityLabel: translate("routes.routeActions") ?? undefined,
                menu: {
                  items: [
                    ...(routeItem
                      ? [
                          {
                            type: "action" as const,
                            label: translate("routeDetails.addToCalendar") ?? "",
                            icon: { type: "sfSymbol" as const, name: "calendar" as const },
                            onPress: addToCalendar,
                          },
                          {
                            type: "action" as const,
                            label:
                              translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations") ?? "",
                            icon: {
                              type: "sfSymbol" as const,
                              name: showEntireRoute
                                ? ("rectangle.compress.vertical" as const)
                                : ("rectangle.expand.vertical" as const),
                            },
                            onPress: () => setShowEntireRoute?.((prev) => !prev),
                          },
                        ]
                      : []),
                    {
                      type: "action",
                      label: translate("fares.title") ?? "",
                      icon: { type: "sfSymbol", name: "shekelsign" },
                      onPress: openFaresSheet,
                    },
                    {
                      type: "action",
                      label: isFilterActive
                        ? `${translate("routes.filter")} (${filterCount})`
                        : (translate("routes.filter") ?? ""),
                      icon: { type: "sfSymbol", name: "line.3.horizontal.decrease" },
                      state: isFilterActive ? "on" : "off",
                      onPress: openFilterSheet,
                    },
                  ],
                },
              },
            ],
          }}
        />
      )}

      <ImageBackground
        source={originStation?.image}
        style={{
          width: "100%",
          height: screenName !== "activeRide" ? 200 : 155,
          zIndex: 0,
        }}
      >
        <LinearGradient style={styles.gradient} colors={["rgba(0, 0, 0, 0.75)", "rgba(0, 0, 0, 0.05)"]} />

        {screenName !== "activeRide" && !useNativeToolbar && (
          <View
            style={{
              position: "absolute",
              top: insets.top,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              ...sideInsetPadding(insets, I18nManager.isRTL, spacing[4]),
              zIndex: 1000,
            }}
            accessibilityRole="header"
            accessibilityLabel={screenName === "routeDetails" ? translate("routes.routeDetails") : translate("plan.title")}
          >
            {/* Back Button */}
            <HeaderBackButton />

            {/* Right Icons */}
            {/* TODO: Check this on iOS 18 & Android */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }} accessibilityRole="toolbar">
              {renderHeaderRight()}
            </View>
          </View>
        )}
      </ImageBackground>

      {/* The photo spans the full width, but the station buttons stay clear of the side bars. */}
      <View style={[{ top: -20, marginBottom: -30, zIndex: 5 }, sideInsetPadding(insets, I18nManager.isRTL)]}>
        <View style={[styles.routeDetailsWrapper, style, splitLayout?.row]}>
          <RouteStationNameButton
            disabled={routeEditDisabled}
            onPress={changeOriginStation}
            buttonScale={stationCardScale}
            style={styles.routeDetailsStation}
            wrapperStyle={splitLayout?.origin}
            name={originName}
            accessibilityLabel={`${translate("plan.origin")}: ${originName}`}
            accessibilityHint={translate("plan.selectStation")}
          />

          <Pressable
            hitSlop={{
              top: spacing[2],
              bottom: spacing[2],
              left: spacing[2],
              right: spacing[2],
            }}
            onPress={swapDirection}
            style={[styles.routeInfoCircleWrapper, splitLayout?.arrow]}
            disabled={routeEditDisabled}
            accessibilityLabel={translate("plan.switchStations")}
            accessibilityHint={translate("plan.switchStationsHint")}
          >
            <GlassView isInteractive={!routeEditDisabled} style={styles.routeInfoCircle} tintColor={color.secondary}>
              <Image source={arrowIcon} style={styles.arrowIcon} />
            </GlassView>
          </Pressable>

          <RouteStationNameButton
            disabled={routeEditDisabled}
            onPress={changeDestinationStation}
            buttonScale={stationCardScale}
            style={styles.routeDetailsStation}
            wrapperStyle={splitLayout?.destination}
            name={destinationName}
            accessibilityLabel={`${translate("plan.destination")}: ${destinationName}`}
            accessibilityHint={translate("plan.selectStation")}
          />
        </View>
      </View>
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  headerMenuIcon: {
    width: 23,
    height: 23,
    resizeMode: "contain",
    tintColor: "lightgrey",
    opacity: 0.9,
  },
  // No badge outside iOS 26, so the glyph itself carries the active filter.
  headerMenuIconActive: {
    tintColor: theme.colors.palette.orange,
    opacity: 1,
  },
  routeDetailsWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: BUTTON_GAP,
  },
  routeDetailsStation: {
    flex: 1,
    padding: theme.spacing[2],
    backgroundColor: theme.colors.secondaryLighter,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.dim,
    shadowRadius: 1,
    shadowOpacity: rt.colorScheme === "dark" ? 0 : 0.45,
    elevation: 3,
    zIndex: 0,
  },
  routeInfoCircleWrapper: {
    position: "absolute",
    zIndex: 5,
  },
  routeInfoCircle: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    alignItems: "center",
    justifyContent: "center",
    // Glass takes its color from `tintColor`; a fill would show as a solid disc behind it.
    backgroundColor: isLiquidGlassSupported ? undefined : theme.colors.secondary,
    borderRadius: 25,
    elevation: 3,
  },
  arrowIcon: {
    width: 15,
    height: 15,
    tintColor: theme.colors.whiteText,
    transform: rt.rtl ? [] : [{ rotate: "180deg" }],
  },
  gradient: {
    height: "100%",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    opacity: 1,
  },
}))
