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
  shadowOpacity: 5,
}

type FavoriteRouteBoxProps = {
  originId: string
  destinationId: string
}

export function FavoriteRouteBox(props: FavoriteRouteBoxProps) {
  const { originId, destinationId } = props

  const [originName, destinationName] = useMemo(() => {
    const origin = stationsObject[originId][stationLocale]
    const destination = stationsObject[destinationId][stationLocale]

    return [origin, destination]
  }, [])

  return (
    <TouchableScale style={CONTAINER} activeScale={0.96} friction={8}>
      <View>
        <View />
        <Text>{originName}</Text>
      </View>
      <Text>{destinationName}</Text>
    </TouchableScale>
  )
}
