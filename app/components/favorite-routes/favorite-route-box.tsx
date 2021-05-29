import React, { useMemo } from "react"
import { View, ViewStyle, Dimensions, TextStyle, ImageBackground, ImageStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing } from "../../theme"

const deviceWidth = Dimensions.get("screen").width
const cardWidth = deviceWidth - spacing[3] * 2

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
  borderColor: color.dimmer,
  borderRadius: 10,
  zIndex: 10,
}

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
      <ImageBackground borderRadius={10} blurRadius={6} source={stationImage} style={IMAGE_BACKGROUND}>
        <View style={BACKGROUND_DIMMER} />
        <View style={[STATION_WRAPPER, { marginBottom: spacing[3] }]}>
          <View style={[STATION_CIRCLE, { backgroundColor: "#fff", borderWidth: 3.5, borderColor: color.secondary }]} />
          <Text style={STATION_NAME}>{originName}</Text>
        </View>
        <RouteLine />
        <View style={STATION_WRAPPER}>
          <View style={STATION_CIRCLE} />
          <Text style={STATION_NAME}>{destinationName}</Text>
        </View>
      </ImageBackground>
    </TouchableScale>
  )
}

const RouteLine = () => (
  <View style={{ position: "absolute", start: 17, width: 2.5, height: 23, backgroundColor: color.dimmer, zIndex: 0 }} />
)
