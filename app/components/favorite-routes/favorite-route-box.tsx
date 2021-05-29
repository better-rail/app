import React, { useMemo } from "react"
import { View, ViewStyle, Dimensions, TextStyle, ImageBackground, Appearance, ImageStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing } from "../../theme"

const deviceWidth = Dimensions.get("screen").width
const cardWidth = deviceWidth - spacing[3] * 2
const isDarkMode = Appearance.getColorScheme() === "dark"

// #region styles
const CONTAINER: ViewStyle = {
  height: 100,
  backgroundColor: "#fff",
  borderRadius: 10,
}

const IMAGE_BACKGROUND: ImageStyle = {
  width: cardWidth,
  height: 100,
  padding: spacing[3],
  justifyContent: "center",
  borderRadius: 8,
  overflow: "hidden",
}

const BACKGROUND_DIMMER: ViewStyle = {
  position: "absolute",
  width: cardWidth,
  height: 100,
  backgroundColor: "#111",
  opacity: 0.6,
}

const STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const STATION_NAME: TextStyle = {
  color: color.whiteText,
  fontWeight: "500",
  fontSize: 16.5,
  textShadowRadius: 6,
  textShadowColor: "rgba(0,0,0,0.5)",
}

const STATION_CIRCLE: ViewStyle = {
  width: 14,
  height: 14,
  marginEnd: spacing[2],
  backgroundColor: "#fff",
  borderWidth: 2,
  borderColor: "lightgrey",
  borderRadius: 10,
  zIndex: 10,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 2,
}

const STATION_ORIGIN_CIRCLE: ViewStyle = {
  backgroundColor: color.secondary,
  borderColor: "#fff",
}

const LINE: ViewStyle = {
  position: "absolute",
  start: 17.3,
  width: 2.5,
  height: 23,
  backgroundColor: "lightgrey",
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.5,
  shadowRadius: 4,
  elevation: 2,
  zIndex: 0,
}
// #endregion

type FavoriteRouteBoxProps = {
  originId: string
  destinationId: string
  onPress: () => void
  style?: ViewStyle
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId, onPress, style } = props

  const [originName, destinationName, stationImage] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]
    const image = stationsObject[originId].image

    return [origin, destination, image]
  }, [])

  return (
    <TouchableScale style={[CONTAINER, style]} activeScale={0.96} friction={8} onPress={onPress}>
      <ImageBackground source={stationImage} style={IMAGE_BACKGROUND} borderRadius={10} blurRadius={6}>
        <View style={BACKGROUND_DIMMER} />
        <View style={[STATION_WRAPPER, { marginBottom: spacing[3] }]}>
          <View style={[STATION_CIRCLE, STATION_ORIGIN_CIRCLE]} />
          <Text style={STATION_NAME}>{originName}</Text>
        </View>
        <View style={LINE} />
        <View style={STATION_WRAPPER}>
          <View style={STATION_CIRCLE} />
          <Text style={STATION_NAME}>{destinationName}</Text>
        </View>
      </ImageBackground>
    </TouchableScale>
  )
}
