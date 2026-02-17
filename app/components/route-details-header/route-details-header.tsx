import { useLayoutEffect, useRef, useEffect, useCallback, useMemo } from "react"
import { Image, ImageBackground, View, Animated as RNAnimated, Pressable } from "react-native"
import type { ViewStyle, TextStyle, ImageStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { trackEvent } from "../../services/analytics"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import LinearGradient from "react-native-linear-gradient"
import { color, isDarkMode, spacing } from "../../theme"
import { StarIcon, MenuIcon } from "../"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "../../data/stations"
import { translate, isRTL } from "../../i18n"
import { useShallow } from "zustand/react/shallow"
import { useFavoritesStore, useRoutePlanStore } from "../../models"
import * as Burnt from "burnt"
import type { RouteItem } from "../../services/api"
import ContextMenu from "react-native-context-menu-view"
import { addRouteToCalendar as addRouteToCalendarHelper, CalendarEventConfig } from "../../utils/helpers/calendar-helpers"
import { createContextMenuActions } from "../route-card/route-context-menu-actions"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"
import { HeaderBackButton } from "../header-back-button"
import { RouteStationNameButton } from "./route-station-name-button"

const arrowIcon = require("../../../assets/arrow-left.png")
const ellipsisIcon = require("../../../assets/ellipsis.regular.png")

const ROUTE_DETAILS_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  gap: spacing[5],
}

// #region styles
const ROUTE_DETAILS_STATION: ViewStyle = {
  flex: 1,
  padding: spacing[2],
  backgroundColor: color.secondaryLighter,
  borderRadius: 25,
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: isDarkMode ? 0 : 0.45,
  elevation: 3,
  zIndex: 0,
}

const ROUTE_DETAILS_STATION_TEXT: TextStyle = {
  color: color.text,
  opacity: 0.8,
  textAlign: "center",
  fontWeight: "600",
  fontSize: 14,
}

const ROUTE_INFO_CIRCLE_WRAPPER: ViewStyle = {
  position: "absolute",
  zIndex: 5,
}

const ROUTE_INFO_CIRCLE: ViewStyle = {
  width: 34,
  height: 34,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: color.secondary,
  borderRadius: 25,
  elevation: 3,
}

const ARROW_ICON: ImageStyle = {
  width: 15,
  height: 15,
  tintColor: color.whiteText,
  transform: isRTL ? [] : [{ rotate: "180deg" }],
}

const GRADIENT: ViewStyle = {
  height: "100%",
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  opacity: 1,
}

const HEADER_RIGHT_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "baseline",
  gap: spacing[1],
  zIndex: 100,
}
// #endregion

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
}

export function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { routeItem, originId, destinationId, screenName, style, showEntireRoute, setShowEntireRoute } = props
  const { routes: favoriteRoutesData, add: addFavorite, remove: removeFavorite } = useFavoritesStore(
    useShallow((s) => ({ routes: s.routes, add: s.add, remove: s.remove }))
  )
  const { origin: routePlanOrigin, destination: routePlanDestination, switchDirection } = useRoutePlanStore(
    useShallow((s) => ({ origin: s.origin, destination: s.destination, switchDirection: s.switchDirection }))
  )
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const routeEditDisabled = screenName !== "routeList"

  const stationCardScale = useRef(new RNAnimated.Value(1)).current

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]
  const routeId = `${originId}${destinationId}`
  const isFavorite = favoriteRoutesData.some((fav) => fav.id === routeId)

  const openStationHoursSheet = () => {
    navigation.navigate("stationHours", { stationId: originId })
  }

  const scaleStationCards = useCallback(() => {
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
  }, [stationCardScale])

  const swapDirection = useCallback(() => {
    scaleStationCards()
    HapticFeedback.trigger("impactMedium")
    setTimeout(() => {
      switchDirection()
    }, 50)
  }, [scaleStationCards, switchDirection])

  const changeOriginStation = useCallback(() => {
    navigation.navigate("selectStation", { selectionType: "origin" })
  }, [navigation])

  const changeDestinationStation = useCallback(() => {
    navigation.navigate("selectStation", { selectionType: "destination" })
  }, [navigation])

  const addToCalendar = useCallback(async () => {
    if (!routeItem) return

    try {
      await addRouteToCalendarHelper(routeItem)
    } catch (error) {
      // Error handling is already done in the helper
      console.error("Failed to add to calendar:", error)
    }
  }, [routeItem])

  const routeMenuActions = useMemo(() => {
    if (!routeItem) return []
    return createContextMenuActions(routeItem, originId, destinationId)
  }, [routeItem, originId, destinationId])

  const shareAction = routeMenuActions.find((action) => action.systemIcon === "square.and.arrow.up")

  const handleShare = useCallback(async () => {
    if (shareAction) {
      await shareAction.onPress()
    }
  }, [shareAction])

  useEffect(() => {
    navigation.setParams({
      originId: routePlanOrigin.id,
      destinationId: routePlanDestination.id,
    } as any)
  }, [routePlanOrigin.id, routePlanDestination.id, navigation])

  const renderHeaderRight = useCallback(() => {
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
      ]

      return (
        <ContextMenu
          dropdownMenuMode
          actions={actions}
          onPress={(event) => {
            const action = actions[event.nativeEvent.index]
            action?.onPress?.()
          }}
        >
          <LiquidGlassView interactive colorScheme="dark" style={{ padding: isLiquidGlassSupported ? 12 : 10, borderRadius: 50 }}>
            <MenuIcon />
          </LiquidGlassView>
        </ContextMenu>
      )
    }

    const handleFavoritePress = () => {
      const favorite = { id: routeId, originId, destinationId }
      if (!isFavorite) {
        Burnt.alert({ title: translate("favorites.added"), duration: 1.5 })
        HapticFeedback.trigger("impactMedium")
        addFavorite(favorite)
        trackEvent("favorite_route_added")
      } else {
        HapticFeedback.trigger("impactLight")
        removeFavorite(favorite.id)
        trackEvent("favorite_route_removed")
      }
    }

    const menuActions = [
      {
        title: translate("routes.filter"),
        systemIcon: "line.3.horizontal.decrease",
        onPress: () => navigation.navigate("slowTrainsFilter"),
      },
      {
        title: translate("routes.stationHours"),
        systemIcon: "clock",
        onPress: openStationHoursSheet,
      },
    ]

    if (isLiquidGlassSupported) {
      return (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[4],
          }}
        >
          <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
          <ContextMenu
            dropdownMenuMode
            actions={menuActions}
            onPress={(event) => {
              HapticFeedback.trigger("impactMedium")
              menuActions[event.nativeEvent.index]?.onPress?.()
            }}
          >
            <LiquidGlassView
              interactive
              colorScheme="dark"
              tintColor="rgba(51, 51, 51, 0.9)"
              style={{ padding: 12, borderRadius: 50 }}
            >
              <Image
                source={ellipsisIcon}
                style={{
                  width: 23,
                  height: 23,
                  resizeMode: "contain",
                  tintColor: "lightgrey",
                  opacity: 0.9,
                }}
              />
            </LiquidGlassView>
          </ContextMenu>
        </View>
      )
    }

    return (
      <>
        <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
        <ContextMenu
          dropdownMenuMode
          actions={menuActions}
          onPress={(event) => {
            HapticFeedback.trigger("impactMedium")
            menuActions[event.nativeEvent.index]?.onPress?.()
          }}
        >
          <Image
            source={ellipsisIcon}
            style={{
              width: 23,
              height: 23,
              marginLeft: spacing[2],
              resizeMode: "contain",
              tintColor: "lightgrey",
              opacity: 0.9,
            }}
          />
        </ContextMenu>
      </>
    )
  }, [
    screenName,
    addToCalendar,
    handleShare,
    isFavorite,
    routeId,
    addFavorite,
    removeFavorite,
    originId,
    destinationId,
    showEntireRoute,
    setShowEntireRoute,
    navigation,
  ])

  useLayoutEffect(() => {
    if (screenName === "activeRide") return

    navigation.setOptions({
      headerShown: false,
    })
  }, [navigation, screenName])

  return (
    <>
      <ImageBackground
        source={stationsObject[originId].image}
        style={{
          width: "100%",
          height: screenName !== "activeRide" ? 200 : 155,
          zIndex: 0,
        }}
      >
        <LinearGradient style={GRADIENT} colors={["rgba(0, 0, 0, 0.75)", "rgba(0, 0, 0, 0.05)"]} />

        {screenName !== "activeRide" && (
          <View
            style={{
              position: "absolute",
              top: insets.top,
              left: 0,
              right: 0,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: spacing[4],
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

      <View style={{ top: -20, marginBottom: -30, zIndex: 5 }}>
        <View style={[ROUTE_DETAILS_WRAPPER, style]}>
          <RouteStationNameButton
            disabled={routeEditDisabled}
            onPress={changeOriginStation}
            buttonScale={stationCardScale}
            style={ROUTE_DETAILS_STATION}
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
            style={ROUTE_INFO_CIRCLE_WRAPPER}
            disabled={routeEditDisabled}
            accessibilityLabel={translate("plan.switchStations")}
            accessibilityHint={translate("plan.switchStationsHint")}
          >
            <LiquidGlassView interactive={!routeEditDisabled} style={ROUTE_INFO_CIRCLE} tintColor={color.secondary}>
              <Image source={arrowIcon} style={ARROW_ICON} />
            </LiquidGlassView>
          </Pressable>

          <RouteStationNameButton
            disabled={routeEditDisabled}
            onPress={changeDestinationStation}
            buttonScale={stationCardScale}
            style={ROUTE_DETAILS_STATION}
            name={destinationName}
            accessibilityLabel={`${translate("plan.destination")}: ${destinationName}`}
            accessibilityHint={translate("plan.selectStation")}
          />
        </View>
      </View>
    </>
  )
}
