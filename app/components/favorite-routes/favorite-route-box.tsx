import React, { useMemo } from "react"
import { View, ViewStyle, Dimensions, TextStyle } from "react-native"
import { Blurhash } from "react-native-blurhash"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing } from "../../theme"

const deviceWidth = Dimensions.get("screen").width

const CONTAINER: ViewStyle = {
  height: 100,
  padding: spacing[3],
  justifyContent: "center",

  borderRadius: 8,
  backgroundColor: "#fff",
  shadowOffset: { width: 1, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 4,
  shadowOpacity: 1,
}

const STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const STATION_NAME: TextStyle = {
  color: color.whiteText,
  fontWeight: "500",
  fontSize: 16.5,
}

const STATION_CIRCLE: ViewStyle = {
  width: 14,
  height: 14,
  marginEnd: spacing[2],
  backgroundColor: color.whiteText,
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

  const [originName, destinationName] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]

    return [origin, destination]
  }, [])

  return (
    <TouchableScale style={[CONTAINER, style]} activeScale={0.96} friction={8} onPress={onPress}>
      <View style={{ width: "100%", position: "absolute" }}>
        <Blurhash
          blurhash="LdFF{pMbx]t7pfs7j]t8x^ogRio#"
          decodePunch={1.2}
          style={{ height: 100, width: deviceWidth - spacing[3] * 2, borderRadius: 8 }}
        />
      </View>
      <View style={[STATION_WRAPPER, { marginBottom: spacing[3] }]}>
        <View
          style={[STATION_CIRCLE, { backgroundColor: color.secondaryBackground, borderWidth: 4, borderColor: color.secondary }]}
        />
        <Text style={STATION_NAME}>{originName}</Text>
      </View>
      <RouteLine />
      <View style={STATION_WRAPPER}>
        <View style={STATION_CIRCLE} />
        <Text style={STATION_NAME}>{destinationName}</Text>
      </View>
    </TouchableScale>
  )
}

const RouteLine = () => (
  <View style={{ position: "absolute", start: 17, width: 2.5, height: 23, backgroundColor: color.dimmer, zIndex: 0 }} />
)
