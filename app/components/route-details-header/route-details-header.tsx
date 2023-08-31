/* eslint-disable react/display-name */
import React, { useMemo, useLayoutEffect, useRef, useEffect } from "react"
import {
  Image,
  ImageBackground,
  View,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Alert,
  Linking,
  Animated,
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
import * as AddCalendarEvent from "react-native-add-calendar-event"
import { CalendarIcon } from "../calendar-icon/calendar-icon"
import { RouteItem } from "../../services/api"

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableScale)

const arrowIcon = require("../../../assets/arrow-left.png")

// #region styles
const ROUTE_DETAILS_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
}

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
  transform: isRTL ? undefined : [{ rotate: "180deg" }],
}

const GARDIENT: ViewStyle = {
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
  /**
   * The screen name we're displaying the header inside
   */
  screenName?: "routeList" | "routeDetails" | "activeRide"
  style?: ViewStyle
  eventConfig?: AddCalendarEvent.CreateOptions
}

export const RouteDetailsHeader = observer(function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { routeItem, originId, destinationId, screenName, style } = props
  const { favoriteRoutes, routePlan } = useStores()
  const navigation = useNavigation()

  const routeEditDisabled = props.screenName !== "routeList"
  const stationCardScale = useRef(new Animated.Value(1)).current

  const addToCalendar = () => {
    analytics().logEvent("add_route_to_calendar")
    const eventConfig = createEventConfig(routeItem)
    AddCalendarEvent.presentEventCreatingDialog(eventConfig).catch((error) => {
      if (error === "permissionNotGranted") {
        Alert.alert(translate("routeDetails.noCalendarAccessTitle"), translate("routeDetails.noCalendarAccessMessage"), [
          {
            style: "cancel",
            text: translate("common.cancel"),
          },
          {
            text: translate("settings.title"),
            onPress: () => Linking.openSettings(),
          },
        ])
      }
    })
  }

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]

  const routeId = `${originId}${destinationId}`

  const swapDirection = () => {
    scaleStationCards()
    HapticFeedback.trigger("impactMedium")

    // Delay the actual switch so it'll be synced with the animation
    setTimeout(() => {
      routePlan.switchDirection()
    }, 50)
  }

  const changeOriginStation = () => {
    navigation.navigate("selectStation", { selectionType: "origin" })
  }

  const changeDestinationStation = () => {
    navigation.navigate("selectStation", { selectionType: "destination" })
  }

  useEffect(() => {
    navigation.setParams({
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
    } as any)
  }, [routePlan.origin.id, routePlan.destination.id])

  const scaleStationCards = () => {
    Animated.sequence([
      Animated.timing(stationCardScale, {
        toValue: 0.94,
        duration: 175,
        useNativeDriver: true,
      }),
      Animated.timing(stationCardScale, {
        toValue: 1,
        duration: 175,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const isFavorite: boolean = useMemo(
    () => !!favoriteRoutes.routes.find((favorite) => favorite.id === routeId),
    [favoriteRoutes.routes.length],
  )

  useLayoutEffect(() => {
    screenName !== "activeRide" &&
      navigation.setOptions({
        headerRight: () => (
          <View style={HEADER_RIGHT_WRAPPER}>
            {screenName === "routeDetails" ? (
              <CalendarIcon onPress={addToCalendar} style={{ marginEnd: spacing[2] }} />
            ) : (
              <StarIcon
                filled={isFavorite}
                onPress={() => {
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
                }}
              />
            )}
          </View>
        ),
      })
  }, [favoriteRoutes.routes.length])

  return (
    <View>
      <ImageBackground
        source={stationsObject[originId].image}
        style={{ width: "100%", height: screenName !== "activeRide" ? 200 : 155, zIndex: 0 }}
      >
        <LinearGradient style={GARDIENT} colors={["rgba(0, 0, 0, 0.75)", "rgba(0, 0, 0, 0.05)"]} />
      </ImageBackground>

      <View style={{ top: -20, marginBottom: -30, zIndex: 5 }}>
        <View style={[ROUTE_DETAILS_WRAPPER, style]}>
          <AnimatedTouchable
            friction={9}
            activeScale={0.95}
            disabled={routeEditDisabled}
            onPress={changeOriginStation}
            style={[ROUTE_DETAILS_STATION, { marginEnd: spacing[5] }, { transform: [{ scale: stationCardScale }] }]}
          >
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {originName}
            </Text>
          </AnimatedTouchable>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={spacing[2]}
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
            style={[ROUTE_DETAILS_STATION, { transform: [{ scale: stationCardScale }] }]}
            onPress={changeDestinationStation}
          >
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {destinationName}
            </Text>
          </AnimatedTouchable>
        </View>
      </View>
    </View>
  )
})

function createEventConfig(routeItem: RouteItem) {
  const { destinationStationName: destination, originStationName: origin, trainNumber } = routeItem.trains[0]

  const title = translate("plan.eventTitle", { destination })
  const notes = translate("plan.trainFromToStation", { trainNumber, origin, destination })

  const eventConfig: AddCalendarEvent.CreateOptions = {
    title,
    startDate: new Date(routeItem.departureTime).toISOString(),
    endDate: new Date(routeItem.arrivalTime).toISOString(),
    location: translate("plan.trainStation", { stationName: origin }),
    notes,
  }

  return eventConfig
}
