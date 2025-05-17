import { useLayoutEffect, useRef, useEffect, useCallback } from "react"
import { Image, ImageBackground, View, Alert, Linking, Animated as RNAnimated, Pressable, Platform } from "react-native"
import type { ViewStyle, TextStyle, ImageStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { analytics } from "../../services/firebase/analytics"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import LinearGradient from "react-native-linear-gradient"
import { color, isDarkMode, spacing } from "../../theme"
import { Text, StarIcon, MenuIcon } from "../"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "../../data/stations"
import { isRTL, translate } from "../../i18n"
import { useStores } from "../../models"
import * as Burnt from "burnt"
import * as Calendar from "expo-calendar"
import type { RouteItem } from "../../services/api"
import type { BottomSheetMethods } from "@gorhom/bottom-sheet/lib/typescript/types"
import ContextMenu from "react-native-context-menu-view"
import { HeaderBackButton } from "@react-navigation/elements"

const AnimatedTouchable = RNAnimated.createAnimatedComponent(TouchableScale)
const arrowIcon = require("../../../assets/arrow-left.png")

const ROUTE_DETAILS_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
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

const ROUTE_DETAILS_STATION_TEXT: TextStyle = {
  color: color.text,
  opacity: 0.8,
  textAlign: "center",
  fontWeight: "600",
  fontSize: 14,
}

const ROUTE_INFO_CIRCLE: ViewStyle = {
  width: 34,
  height: 34,
  position: "absolute",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: color.secondary,
  borderRadius: 25,
  elevation: 3,
  zIndex: 5,
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
    analytics.logEvent("add_route_to_calendar")

    const { status } = await Calendar.requestCalendarPermissionsAsync()

    if (status !== "granted") {
      Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
        { style: "cancel", text: translate("common.cancel") },
        { text: translate("settings.title"), onPress: () => Linking.openSettings() },
      ])
      return
    }

    const eventConfig = createEventConfig(routeItem)

    try {
      await Calendar.createEventInCalendarAsync({
        title: eventConfig.title,
        startDate: new Date(eventConfig.startDate),
        endDate: new Date(eventConfig.endDate),
        location: eventConfig.location,
        notes: eventConfig.notes,
      })
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        Alert.alert("Event Error", error.message)
      }
    }
  }, [routeItem])

  useEffect(() => {
    navigation.setParams({
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
    } as any)
  }, [routePlan.origin.id, routePlan.destination.id, navigation])

  const renderHeaderRight = useCallback(() => {
    if (screenName === "routeDetails") {
      return (
        <ContextMenu
          dropdownMenuMode
          actions={[
            { title: translate("routeDetails.addToCalendar"), systemIcon: "calendar" },
            {
              title: translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations"),
              systemIcon: showEntireRoute ? "rectangle.compress.vertical" : "rectangle.expand.vertical",
            },
          ]}
          onPress={(event) => {
            if (event.nativeEvent.index === 0) {
              addToCalendar()
            } else if (event.nativeEvent.index === 1) {
              setShowEntireRoute((prev) => !prev)
            }
          }}
          style={{
            ...(Platform.OS === "android" && {
              marginTop: spacing[6],
            }),
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
      <View
        style={{
          marginRight: Platform.select({ ios: 0, android: 0 }),
          flexDirection: "row",
          alignItems: "baseline",
          gap: spacing[4],
          marginTop: Platform.select({ ios: 0, android: spacing[6] }),
        }}
      >
        <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
        <Pressable onPress={openStationHoursSheet}>
          <Image
            source={require("../../../assets/clock-ios.png")}
            style={{ width: 23, height: 23, marginLeft: spacing[2], tintColor: "lightgrey", opacity: 0.9 }}
          />
        </Pressable>
      </View>
    )
  }, [
    screenName,
    addToCalendar,
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
      ...(Platform.OS === "android"
        ? {
            headerLeft: (props) => (
              <View
                style={{
                  marginTop: spacing[6],
                  marginLeft: -20,
                }}
              >
                <HeaderBackButton tintColor="lightgrey" style={{ opacity: 0.9 }} onPress={() => navigation.goBack()} {...props} />
              </View>
            ),
          }
        : {}),
      headerRight: () => <View style={HEADER_RIGHT_WRAPPER}>{renderHeaderRight()}</View>,
    })
  }, [screenName, navigation, renderHeaderRight])

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
      </ImageBackground>

      <View style={{ top: -20, marginBottom: -30, zIndex: 5 }}>
        <View style={[ROUTE_DETAILS_WRAPPER, style]}>
          <AnimatedTouchable
            friction={9}
            activeScale={0.95}
            disabled={routeEditDisabled}
            onPress={changeOriginStation}
            style={[ROUTE_DETAILS_STATION, { marginEnd: spacing[5], transform: [{ scale: stationCardScale }] }]}
          >
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {originName}
            </Text>
          </AnimatedTouchable>

          <Pressable
            hitSlop={{ top: spacing[2], bottom: spacing[2], left: spacing[2], right: spacing[2] }}
            onPress={swapDirection}
            style={ROUTE_INFO_CIRCLE}
            disabled={routeEditDisabled}
          >
            <Image source={arrowIcon} style={ARROW_ICON} />
          </Pressable>

          <AnimatedTouchable
            friction={9}
            activeScale={0.95}
            disabled={routeEditDisabled}
            onPress={changeDestinationStation}
            style={[ROUTE_DETAILS_STATION, { transform: [{ scale: stationCardScale }] }]}
          >
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {destinationName}
            </Text>
          </AnimatedTouchable>
        </View>
      </View>
    </>
  )
})

function createEventConfig(routeItem: RouteItem) {
  if (!routeItem?.trains?.length) {
    throw new Error("No trains found in routeItem")
  }

  const origin = routeItem.trains[0].originStationName
  const trainNumber = routeItem.trains[0].trainNumber
  const destination = routeItem.trains[routeItem.trains.length - 1].destinationStationName

  const title = translate("plan.rideTo", { destination })
  const notes = translate("plan.trainFromToStation", { trainNumber, origin, destination })

  return {
    title,
    startDate: new Date(routeItem.departureTime).toISOString(),
    endDate: new Date(routeItem.arrivalTime).toISOString(),
    location: translate("plan.trainStation", { stationName: origin }),
    notes,
  }
}
