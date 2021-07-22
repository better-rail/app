/* eslint-disable react/display-name */
import React, { useMemo, useLayoutEffect } from "react"
import { Image, TouchableOpacity, ImageBackground, View, ViewStyle, TextStyle, ImageStyle } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import LinearGradient from "react-native-linear-gradient"
import { color, isDarkMode, spacing } from "../../theme"
import { Text, StarIcon } from "../"
import HapticFeedback from "react-native-haptic-feedback"
import { stationsObject, stationLocale } from "../../data/stations"
import { isRTL, translate } from "../../i18n"
import { useStores } from "../../models"
import { useToast } from "react-native-toast-hybrid"
import { isOldAndroid } from "../../utils/helpers/supported-versions"

const arrowIcon = require("../../../assets/arrow-left.png")
const shekelIcon = require("../../../assets/shekel.png")

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
  elevation: 1,
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
  elevation: 1,
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
}

const SHEKEL_ICON: ImageStyle = {
  width: 26.5,
  height: 26.5,
  resizeMode: "contain",
  tintColor: "lightgrey",
  marginEnd: spacing[2] + 2,
  opacity: 0.9,
}
// #endregion

export interface RouteDetailsHeaderProps {
  originId: string
  destinationId: string
  openFaresBottomSheet: () => void
  style?: ViewStyle
}

export const RouteDetailsHeader = observer(function RouteDetailsHeader(props: RouteDetailsHeaderProps) {
  const { originId, destinationId, style } = props
  const { favoriteRoutes } = useStores()
  const navigation = useNavigation()
  const toast = useToast()

  const originName = stationsObject[originId][stationLocale]
  const destinationName = stationsObject[destinationId][stationLocale]

  const routeId = `${originId}${destinationId}`

  const isFavorite: boolean = useMemo(() => {
    return favoriteRoutes.routes.find((favorite) => favorite.id === routeId)
  }, [favoriteRoutes.routes.length])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={HEADER_RIGHT_WRAPPER}>
          {props.openFaresBottomSheet && (
            <>
              {!isOldAndroid && (
                <TouchableOpacity onPress={() => props.openFaresBottomSheet()}>
                  <Image source={shekelIcon} style={SHEKEL_ICON} />
                </TouchableOpacity>
              )}

              <StarIcon
                filled={isFavorite}
                onPress={() => {
                  const favorite = { id: routeId, originId, destinationId }
                  if (!isFavorite) {
                    toast.done(translate("favorites.added"))
                    HapticFeedback.trigger("impactMedium")
                    favoriteRoutes.add(favorite)
                  } else {
                    HapticFeedback.trigger("impactLight")
                    favoriteRoutes.remove(favorite)
                  }
                }}
              />
            </>
          )}
        </View>
      ),
    })
  }, [favoriteRoutes.routes.length])

  return (
    <View>
      <ImageBackground source={stationsObject[originId].image} style={{ width: "100%", height: 200, zIndex: 0 }}>
        <LinearGradient style={GARDIENT} colors={["rgba(0, 0, 0, 0.75)", "rgba(0, 0, 0, 0.05)"]} />
      </ImageBackground>

      <View style={{ top: -20, marginBottom: -30, zIndex: 5 }}>
        <View style={[ROUTE_DETAILS_WRAPPER, style]}>
          <View style={[ROUTE_DETAILS_STATION, { marginEnd: spacing[5] }]}>
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {originName}
            </Text>
          </View>
          <View style={ROUTE_INFO_CIRCLE}>
            <Image source={arrowIcon} style={ARROW_ICON} />
          </View>
          <View style={ROUTE_DETAILS_STATION}>
            <Text style={ROUTE_DETAILS_STATION_TEXT} maxFontSizeMultiplier={1.1}>
              {destinationName}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
})
