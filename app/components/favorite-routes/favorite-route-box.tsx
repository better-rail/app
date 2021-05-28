import React, { useMemo } from "react"
import { View, ViewStyle } from "react-native"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "../"
import { stationLocale, stationsObject } from "../../data/stations"
import { color, spacing } from "../../theme"

const CONTAINER: ViewStyle = {
  height: 100,
  borderWidth: 1,
  justifyContent: "center",
  padding: spacing[3],
  shadowOffset: { width: 0, height: 0 },
  shadowColor: color.dim,
  shadowRadius: 1,
  shadowOpacity: 0,
}

const STATION_WRAPPER: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
}

const STATION_CIRCLE: ViewStyle = {
  width: 14,
  height: 14,
  marginEnd: spacing[2],
  backgroundColor: color.separator,
  borderRadius: 10,
  zIndex: 10,
}

type FavoriteRouteBoxProps = {
  originId: string
  destinationId: string
  onPress: () => void
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId, onPress } = props

  const [originName, destinationName] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]

    return [origin, destination]
  }, [])

  return (
    <TouchableScale style={CONTAINER} activeScale={0.96} friction={8} onPress={onPress}>
      <View style={[STATION_WRAPPER, { marginBottom: spacing[2] }]}>
        <View style={[STATION_CIRCLE, { backgroundColor: color.secondary }]} />
        <Text>{originName}</Text>
      </View>
      <RouteLine />
      <View style={STATION_WRAPPER}>
        <View style={STATION_CIRCLE} />
        <Text>{destinationName}</Text>
      </View>
    </TouchableScale>
  )
}

const RouteLine = () => (
  <View style={{ position: "absolute", start: "4.5%", width: 4, height: 40, backgroundColor: color.separator, zIndex: 0 }} />
)
