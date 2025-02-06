import React, { useLayoutEffect, useRef, useEffect, useCallback } from "react"
import {
  Image,
  ImageBackground,
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Alert,
  Linking,
  Animated as RNAnimated,
  TouchableOpacity,
} from "react-native"
import TouchableScale from "react-native-touchable-scale"
import analytics from "@react-native-firebase/analytics"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import LinearGradient from "react-native-linear-gradient"
import { color, isDarkMode, spacing } from "../../theme"
import { Text, StarIcon } from "../"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "../../data/stations"
import { isRTL, translate } from "../../i18n"
import { useStores } from "../../models"
import * as Burnt from "burnt"
import * as Calendar from "expo-calendar"
import { CalendarIcon } from "../calendar-icon/calendar-icon"
import type { RouteItem } from "../../services/api"

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
  alignItems: "center",
  marginEnd: spacing[2],
  zIndex: 100,
}
// #endregion

export interface RouteDetailsHeaderProps {
  originId: string
  destinationId: string
  routeItem: RouteItem
  screenName?: "routeList" | "routeDetails" | "activeRide"
  style?: ViewStyle
  eventConfig?: Calendar.Event
}

export const RouteDetailsHeader = observer(function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { originId, destinationId, routeItem, screenName, style } = props
  const { favoriteRoutes, routePlan } = useStores()
  const navigation = useNavigation()
  const routeEditDisabled = screenName !== "routeList"

  const stationCardScale = useRef(new RNAnimated.Value(1)).current

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]
  const routeId = `${originId}${destinationId}`
  const isFavorite = favoriteRoutes.routes.some((fav) => fav.id === routeId)

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
    analytics().logEvent("add_route_to_calendar")

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

      Burnt.alert({ title: "Event Added", duration: 1.5 })
    } catch (error) {
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
      return <CalendarIcon onPress={addToCalendar} style={{ marginEnd: -spacing[3] }} />
    }

    const handleFavoritePress = () => {
      const favorite = { id: routeId, originId, destinationId }
      if (!isFavorite) {
        Burnt.alert({ title: translate("favorites.added"), duration: 1.5 })
        HapticFeedback.trigger("impactMedium")
        favoriteRoutes.add(favorite)
        analytics().logEvent("favorite_route_added")
      } else {
        HapticFeedback.trigger("impactLight")
        favoriteRoutes.remove(favorite.id)
        analytics().logEvent("favorite_route_removed")
      }
    }

    return <StarIcon style={{ marginEnd: -spacing[3] }} filled={isFavorite} onPress={handleFavoritePress} />
  }, [screenName, addToCalendar, isFavorite, routeId, favoriteRoutes, originId, destinationId])

  useLayoutEffect(() => {
    if (screenName === "activeRide") return

    navigation.setOptions({
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

          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{
              top: spacing[2],
              bottom: spacing[2],
              left: spacing[2],
              right: spacing[2],
            }}
            onPress={swapDirection}
            style={ROUTE_INFO_CIRCLE}
            disabled={routeEditDisabled}
          >
            <Image source={arrowIcon} style={ARROW_ICON} />
          </TouchableOpacity>

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

  const { destinationStationName: destination, originStationName: origin, trainNumber } = routeItem.trains[0]
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
