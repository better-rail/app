import { useLayoutEffect, useRef, useEffect, useCallback, useMemo } from "react"
import { Image, ImageBackground, View, Animated as RNAnimated, Pressable, Platform } from "react-native"
import type { ViewStyle, TextStyle, ImageStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { analytics } from "../../services/firebase/analytics"
import { observer } from "mobx-react-lite"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import LinearGradient from "react-native-linear-gradient"
import { color, isDarkMode, spacing } from "../../theme"
import { Text, StarIcon, MenuIcon } from "../"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "../../data/stations"
import { translate, isRTL } from "../../i18n"
import { useStores } from "../../models"
import * as Burnt from "burnt"
import type { RouteItem } from "../../services/api"
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types"
import ContextMenu from "react-native-context-menu-view"
import { HeaderBackButton } from "@react-navigation/elements"
import { addRouteToCalendar as addRouteToCalendarHelper } from "../../utils/helpers/calendar-helpers"
import { createContextMenuActions } from "../route-card/route-context-menu-actions"
import { RouteStationNameButton } from "./route-station-name-button"
import { LiquidGlassView } from "@callstack/liquid-glass"

const arrowIcon = require("../../../assets/arrow-left.png")

const ROUTE_DETAILS_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  gap: spacing[4],
  alignItems: "center",
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
  eventConfig?: Calendar.Event
  stationHoursSheetRef?: React.MutableRefObject<BottomSheetMethods>
  showEntireRoute?: boolean
  setShowEntireRoute?: React.Dispatch<React.SetStateAction<boolean>>
}

export const RouteDetailsHeader = observer(function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { routeItem, originId, destinationId, screenName, style, stationHoursSheetRef, showEntireRoute, setShowEntireRoute } =
    props
  const { favoriteRoutes, routePlan } = useStores()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const routeEditDisabled = screenName !== "routeList"

  const stationCardScale = useRef(new RNAnimated.Value(1)).current

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]
  const routeId = `${originId}${destinationId}`
  const isFavorite = favoriteRoutes.routes.some((fav) => fav.id === routeId)

  const openStationHoursSheet = () => {
    HapticFeedback.trigger("impactMedium")
    stationHoursSheetRef?.current?.expand()
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
      routePlan.switchDirection()
    }, 50)
  }, [scaleStationCards, routePlan])

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
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
    } as any)
  }, [routePlan.origin.id, routePlan.destination.id, navigation])

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
          <MenuIcon />
        </ContextMenu>
      )
    }

    const handleFavoritePress = () => {
      const favorite = { id: routeId, originId, destinationId }
      if (!isFavorite) {
        Burnt.alert({ title: translate("favorites.added"), duration: 1.5 })
        HapticFeedback.trigger("impactMedium")
        favoriteRoutes.add(favorite)
        analytics.logEvent("favorite_route_added")
      } else {
        HapticFeedback.trigger("impactLight")
        favoriteRoutes.remove(favorite.id)
        analytics.logEvent("favorite_route_removed")
      }
    }

    return (
      <>
        <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
        <Pressable onPress={openStationHoursSheet}>
          <Image
            source={require("../../../assets/clock-ios.png")}
            style={{ width: 23, height: 23, marginLeft: spacing[2], tintColor: "lightgrey", opacity: 0.9 }}
          />
        </Pressable>
      </>
    )
  }, [
    screenName,
    addToCalendar,
    handleShare,
    isFavorite,
    routeId,
    favoriteRoutes,
    originId,
    destinationId,
    showEntireRoute,
    setShowEntireRoute,
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
            <View style={Platform.select({ android: { marginLeft: -spacing[4] }, ios: {} })}>
              <HeaderBackButton tintColor="rgba(211, 211, 211, 0.9)" onPress={() => navigation.goBack()} />
            </View>

            {/* Right Icons */}
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
            style={ROUTE_DETAILS_STATION}
            buttonScale={stationCardScale}
            onPress={changeOriginStation}
            accessibilityLabel={`${translate("plan.origin")}: ${originName}`}
            accessibilityHint={translate("plan.selectStation")}
            name={originName}
          />

          <Pressable
            hitSlop={{ top: spacing[2], bottom: spacing[2], left: spacing[2], right: spacing[2] }}
            onPress={swapDirection}
            style={ROUTE_INFO_CIRCLE_WRAPPER}
            disabled={routeEditDisabled}
            accessibilityLabel={translate("plan.switchStations")}
            accessibilityHint={translate("plan.switchStationsHint")}
          >
            <LiquidGlassView interactive style={ROUTE_INFO_CIRCLE} tintColor={color.secondary}>
              <Image source={arrowIcon} style={ARROW_ICON} />
            </LiquidGlassView>
          </Pressable>

          <RouteStationNameButton
            disabled={routeEditDisabled}
            onPress={changeDestinationStation}
            style={ROUTE_DETAILS_STATION}
            buttonScale={stationCardScale}
            accessibilityLabel={`${translate("plan.destination")}: ${destinationName}`}
            accessibilityHint={translate("plan.selectStation")}
            name={destinationName}
          />
        </View>
      </View>
    </>
  )
})
